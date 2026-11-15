#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$OutputPath = ''
)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$sourceRoot = Join-Path $projectRoot 'source'

# Node is mandatory: an unavailable validator must never produce a successful build.
$node = Get-Command node -ErrorAction Stop
$nodeMajor = [int]((& $node.Source --version).TrimStart('v').Split('.')[0])
if ($LASTEXITCODE -ne 0 -or $nodeMajor -notin @(22, 24, 26)) {
    throw 'Node.js 22, 24 or 26 is required.'
}
$package = Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $projectRoot "dist/Canopy-v$($package.version)-zh_CN.mcaddon"
}
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
if ([System.IO.Path]::GetExtension($resolvedOutput) -ne '.mcaddon') {
    throw 'OutputPath must use the .mcaddon extension.'
}
$comparison = [System.StringComparison]::OrdinalIgnoreCase
if ($resolvedOutput.StartsWith($sourceRoot + [System.IO.Path]::DirectorySeparatorChar, $comparison)) {
    throw 'OutputPath must be outside source/.'
}

& $node.Source (Join-Path $PSScriptRoot 'validate.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Project validation failed. Existing build outputs were preserved.' }

$outputDirectory = Split-Path -Parent $resolvedOutput
[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
$temporaryOutput = Join-Path $outputDirectory ('.' + [System.IO.Path]::GetFileName($resolvedOutput) + '.' + [guid]::NewGuid().ToString('N') + '.tmp')
$checksumPath = $resolvedOutput + '.sha256'
$temporaryChecksum = $temporaryOutput + '.sha256'

function Install-Output([string]$temporary, [string]$target) {
    if (Test-Path -LiteralPath $target -PathType Leaf) {
        [System.IO.File]::Replace($temporary, $target, [NullString]::Value)
    } else {
        [System.IO.File]::Move($temporary, $target)
    }
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
try {
    $files = @(Get-ChildItem -LiteralPath $sourceRoot -Recurse -File -Force | Sort-Object FullName)
    $stream = [System.IO.File]::Open($temporaryOutput, [System.IO.FileMode]::CreateNew)
    $archive = $null
    try {
        $archive = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create)
        foreach ($file in $files) {
            $relative = $file.FullName.Substring($sourceRoot.Length).TrimStart([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
            $entryName = $relative.Replace('\', '/')
            if (-not ($entryName.StartsWith('Canopy[BP]/') -or $entryName.StartsWith('Canopy[RP]/'))) {
                throw "Unexpected package path: $entryName"
            }
            $entry = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
            # Stable timestamps make repeated builds with the same inputs/runtime comparable.
            $entry.LastWriteTime = [System.DateTimeOffset]::new(2000, 1, 1, 0, 0, 0, [System.TimeSpan]::Zero)
            $inputStream = [System.IO.File]::OpenRead($file.FullName)
            $entryStream = $null
            try {
                $entryStream = $entry.Open()
                $inputStream.CopyTo($entryStream)
            } finally {
                if ($null -ne $entryStream) { $entryStream.Dispose() }
                $inputStream.Dispose()
            }
        }
    } finally {
        if ($null -ne $archive) { $archive.Dispose() }
        $stream.Dispose()
    }

    $zip = [System.IO.Compression.ZipFile]::OpenRead($temporaryOutput)
    try {
        $names = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
        foreach ($entry in $zip.Entries) {
            if (-not $names.Add($entry.FullName) -or $entry.FullName.Contains('\') -or $entry.FullName.Contains('../') -or
                -not ($entry.FullName.StartsWith('Canopy[BP]/') -or $entry.FullName.StartsWith('Canopy[RP]/'))) {
                throw "Unsafe or duplicate archive entry: $($entry.FullName)"
            }
        }
        if ($zip.Entries.Count -ne $files.Count) { throw 'Archive file count differs from source/.' }
        foreach ($required in @('Canopy[BP]/manifest.json', 'Canopy[RP]/manifest.json', 'Canopy[BP]/scripts/main.js', 'Canopy[RP]/texts/zh_CN.lang', 'Canopy[BP]/scripts/lib/jsep/LICENSE')) {
            if (-not $names.Contains($required)) { throw "Archive is missing: $required" }
        }
        $entryCount = $zip.Entries.Count
    } finally {
        $zip.Dispose()
    }

    $hashInput = [System.IO.File]::OpenRead($temporaryOutput)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hash = [System.BitConverter]::ToString($sha256.ComputeHash($hashInput)).Replace('-', '').ToLowerInvariant()
    } finally {
        $sha256.Dispose()
        $hashInput.Dispose()
    }
    [System.IO.File]::WriteAllText($temporaryChecksum, "$hash  $([System.IO.Path]::GetFileName($resolvedOutput))`n", [System.Text.UTF8Encoding]::new($false))
    Install-Output $temporaryOutput $resolvedOutput
    Install-Output $temporaryChecksum $checksumPath
    Write-Output "Built $resolvedOutput ($entryCount files)"
    Write-Output "SHA256 $hash"
    Write-Output "Checksum $checksumPath"
} finally {
    foreach ($temporary in @($temporaryOutput, $temporaryChecksum)) {
        if (Test-Path -LiteralPath $temporary -PathType Leaf) { Remove-Item -LiteralPath $temporary -Force }
    }
}
