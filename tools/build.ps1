[CmdletBinding()]
param(
    [string]$OutputPath = ''
)

$ErrorActionPreference = 'Stop'

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $projectRoot 'dist/Canopy-v1.6.3-zh_CN.mcaddon'
}

$sourceRoot = Join-Path $projectRoot 'source'
$behaviorRoot = Join-Path $sourceRoot 'Canopy[BP]'
$resourceRoot = Join-Path $sourceRoot 'Canopy[RP]'

if (-not (Test-Path -LiteralPath $behaviorRoot -PathType Container) -or
    -not (Test-Path -LiteralPath $resourceRoot -PathType Container)) {
    throw 'source/Canopy[BP] and source/Canopy[RP] are required.'
}

function Read-LangKeys([string]$path) {
    $keys = [System.Collections.Generic.List[string]]::new()
    foreach ($line in Get-Content -LiteralPath $path -Encoding UTF8) {
        if ($line -match '^\s*([^#\s][^=]*?)=') {
            $keys.Add($matches[1].Trim())
        }
    }
    return $keys
}

foreach ($manifest in @(
    (Join-Path $behaviorRoot 'manifest.json'),
    (Join-Path $resourceRoot 'manifest.json')
)) {
    Get-Content -LiteralPath $manifest -Raw -Encoding UTF8 | ConvertFrom-Json | Out-Null
}

$languageDirectory = Join-Path $resourceRoot 'texts'
$languageFiles = @(Get-ChildItem -LiteralPath $languageDirectory -Filter '*.lang' -File)
$allKeys = [System.Collections.Generic.HashSet[string]]::new()
foreach ($languageFile in $languageFiles) {
    $keys = Read-LangKeys $languageFile.FullName
    $duplicates = @($keys | Group-Object -CaseSensitive | Where-Object Count -gt 1)
    if ($duplicates.Count -gt 0) {
        throw "Duplicate language keys in $($languageFile.Name): $($duplicates.Name -join ', ')"
    }
    foreach ($key in $keys) {
        $null = $allKeys.Add($key)
    }
}

$zhPath = Join-Path $languageDirectory 'zh_CN.lang'
$zhKeys = [System.Collections.Generic.HashSet[string]]::new()
foreach ($key in (Read-LangKeys $zhPath)) {
    $null = $zhKeys.Add($key)
}
$missingKeys = @($allKeys | Where-Object { -not $zhKeys.Contains($_) } | Sort-Object)
if ($missingKeys.Count -gt 0) {
    throw "zh_CN.lang is missing $($missingKeys.Count) keys: $($missingKeys -join ', ')"
}

$javascriptFiles = @(Get-ChildItem -LiteralPath $sourceRoot -Recurse -Filter '*.js' -File)
if (Get-Command node -ErrorAction SilentlyContinue) {
    foreach ($javascriptFile in $javascriptFiles) {
        & node --check $javascriptFile.FullName
        if ($LASTEXITCODE -ne 0) {
            throw "JavaScript syntax check failed: $($javascriptFile.FullName)"
        }
    }
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = Split-Path -Parent $resolvedOutput
[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
if (Test-Path -LiteralPath $resolvedOutput) {
    Remove-Item -LiteralPath $resolvedOutput -Force
}

# Windows PowerShell may not load the base ZipArchive assembly when only the
# extension assembly is requested.
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stream = [System.IO.File]::Open($resolvedOutput, [System.IO.FileMode]::CreateNew)
$archive = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in (Get-ChildItem -LiteralPath $sourceRoot -Recurse -File | Sort-Object FullName)) {
        $relative = $file.FullName.Substring($sourceRoot.Length).TrimStart([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
        $entryName = $relative.Replace('\', '/')
        if (-not ($entryName.StartsWith('Canopy[BP]/') -or $entryName.StartsWith('Canopy[RP]/'))) {
            throw "Unexpected package path: $entryName"
        }
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $archive,
            $file.FullName,
            $entryName,
            [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
}
finally {
    $archive.Dispose()
    $stream.Dispose()
}

$zip = [System.IO.Compression.ZipFile]::OpenRead($resolvedOutput)
try {
    $unexpected = @($zip.Entries | Where-Object {
        -not ($_.FullName.StartsWith('Canopy[BP]/') -or $_.FullName.StartsWith('Canopy[RP]/'))
    })
    if ($unexpected.Count -gt 0) {
        throw "Unexpected entries in output archive: $($unexpected.FullName -join ', ')"
    }
    $entryCount = $zip.Entries.Count
}
finally {
    $zip.Dispose()
}

Write-Output "Built $resolvedOutput ($entryCount files)"
