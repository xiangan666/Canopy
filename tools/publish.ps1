#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Repository = 'xiangan666/Canopy',
    [string]$Tag = ''
)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$dist = Join-Path $projectRoot 'dist'
$package = Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $Tag) { $Tag = "v$($package.version)" }
if ($Tag -cne "v$($package.version)") { throw 'Tag must equal v followed by the package.json version.' }
if ($Repository -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') { throw 'Repository must use owner/name syntax.' }
$null = Get-Command git, gh -ErrorAction Stop

function Invoke-Native([string]$command, [string[]]$arguments) {
    $result = & $command @arguments
    if ($LASTEXITCODE -ne 0) { throw "$command failed with exit code $LASTEXITCODE." }
    return $result
}

function Get-Release {
    # The tag REST endpoint omits drafts. The CLI also finds unpublished releases.
    $result = & gh release view $Tag --repo $Repository --json databaseId 2>&1
    if ($LASTEXITCODE -ne 0) {
        $message = ($result -join "`n").Trim()
        if ($message -ceq 'release not found') { return $null }
        throw "Cannot inspect release: $message"
    }
    $releaseId = (($result -join "`n") | ConvertFrom-Json).databaseId
    if ("$releaseId" -notmatch '^[1-9][0-9]*$') { throw 'GitHub CLI returned an invalid release ID.' }
    $details = Invoke-Native gh @('api', "repos/$Repository/releases/$releaseId")
    return (($details -join "`n") | ConvertFrom-Json)
}

function Assert-Assets($release, [System.IO.FileInfo[]]$assets) {
    $expectedNames = @($assets.Name | Sort-Object)
    $actualNames = @($release.assets.name | Sort-Object)
    if (($expectedNames -join ',') -cne ($actualNames -join ',')) { throw 'Remote asset names differ from the expected distribution.' }
    $verificationRoot = [System.IO.Path]::GetFullPath((Join-Path $dist ('.verify-' + [guid]::NewGuid().ToString('N'))))
    if (-not $verificationRoot.StartsWith($dist + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw 'Verification directory must stay inside dist/.'
    }
    [System.IO.Directory]::CreateDirectory($verificationRoot) | Out-Null
    try {
        Invoke-Native gh @('release', 'download', $Tag, '--repo', $Repository, '--pattern', '*', '--dir', $verificationRoot) | Out-Host
        foreach ($asset in $assets) {
            $remote = $release.assets | Where-Object name -CEQ $asset.Name
            $expectedHash = (Get-FileHash -LiteralPath $asset.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
            $downloaded = Get-Item -LiteralPath (Join-Path $verificationRoot $asset.Name)
            $downloadedHash = (Get-FileHash -LiteralPath $downloaded.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
            if ($remote.size -ne $asset.Length -or $downloaded.Length -ne $asset.Length -or $downloadedHash -cne $expectedHash) {
                throw "Remote asset size or SHA-256 mismatch: $($asset.Name)"
            }
            if ($remote.digest -and $remote.digest -cne "sha256:$expectedHash") { throw "GitHub digest mismatch: $($asset.Name)" }
            Write-Host "Verified $($asset.Name) ($($asset.Length) bytes, SHA256 $expectedHash)"
        }
    } finally {
        Remove-Item -LiteralPath $verificationRoot -Recurse -Force
    }
}

Push-Location -LiteralPath $projectRoot
try {
    $status = @(Invoke-Native git @('status', '--porcelain', '--untracked-files=normal'))
    if ($status.Count -gt 0) { throw 'Commit all project changes before publishing; the working tree must be clean.' }
    $commit = (Invoke-Native git @('rev-parse', 'HEAD')).Trim()
    $tagCommit = (Invoke-Native git @('rev-parse', "$Tag^{commit}")).Trim()
    if ($tagCommit -cne $commit) { throw 'The local tag must identify the current commit.' }
    $remoteCommit = (Invoke-Native gh @('api', "repos/$Repository/commits/$Tag", '--jq', '.sha')).Trim()
    if ($remoteCommit -cne $commit) { throw 'Push the exact commit and tag before publishing.' }

    $changelog = Get-Content -LiteralPath (Join-Path $projectRoot 'CHANGELOG.md') -Raw -Encoding UTF8
    $pattern = '(?ms)^## \[' + [regex]::Escape($package.version) + '\] - \d{4}-\d{2}-\d{2}\r?\n(.*?)(?=^## |\z)'
    $match = [regex]::Match($changelog, $pattern)
    if (-not $match.Success) { throw 'CHANGELOG.md needs a dated entry for the version being published.' }

    & (Join-Path $PSScriptRoot 'build.ps1')
    $prefix = "Canopy-$Tag-zh_CN"
    $addon = Join-Path $dist "$prefix.mcaddon"
    $sourceArchive = Join-Path $dist "$prefix-source.zip"
    Invoke-Native git @('archive', '--format=zip', "--prefix=$prefix/", "--output=$sourceArchive", $commit) | Out-Host
    $distributions = @(Get-Item -LiteralPath $addon, $sourceArchive)
    $checksums = foreach ($file in $distributions) {
        "$((Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant())  $($file.Name)"
    }
    $checksumPath = Join-Path $dist 'SHA256SUMS.txt'
    [System.IO.File]::WriteAllText($checksumPath, ($checksums -join "`n") + "`n", [System.Text.UTF8Encoding]::new($false))
    $assets = @($distributions) + @(Get-Item -LiteralPath $checksumPath)
    $notesPath = Join-Path $dist 'release-notes.md'
    $notes = "Canopy $($package.version) 简体中文维护版，基于上游 v1.6.3。提供可导入扩展包、完整源码和 SHA-256 摘要。`n`n" +
        $match.Groups[1].Value.Trim() + "`n`n" +
        "安装与升级：https://github.com/$Repository/blob/$Tag/docs/installation.md`n`n" +
        "测试边界：https://github.com/$Repository/blob/$Tag/docs/testing.md`n`n" +
        "完整记录：https://github.com/$Repository/blob/$Tag/CHANGELOG.md`n`n" +
        "发布提交：$commit`n"
    [System.IO.File]::WriteAllText($notesPath, $notes, [System.Text.UTF8Encoding]::new($false))

    $release = Get-Release
    if ($null -eq $release) {
        Invoke-Native gh @('release', 'create', $Tag, '--repo', $Repository, '--verify-tag', '--draft', '--title', "Canopy $Tag 简体中文维护版", '--notes-file', $notesPath) | Out-Host
        $release = Get-Release
    }
    if ($release.draft) {
        Invoke-Native gh (@('release', 'upload', $Tag, '--repo', $Repository, '--clobber') + @($assets.FullName)) | Out-Host
        Invoke-Native gh @('release', 'edit', $Tag, '--repo', $Repository, '--notes-file', $notesPath) | Out-Host
        $release = Get-Release
        Assert-Assets $release $assets
        Invoke-Native gh @('release', 'edit', $Tag, '--repo', $Repository, '--draft=false', '--prerelease=false', '--latest') | Out-Host
        $release = Get-Release
    }
    # A rerun verifies an existing release and never replaces published assets.
    if ($release.draft -or $release.prerelease -or -not $release.published_at) { throw 'Release is not a published stable release.' }
    Assert-Assets $release $assets
    $latest = (Invoke-Native gh @('api', "repos/$Repository/releases/latest", '--jq', '.tag_name')).Trim()
    if ($latest -cne $Tag) { throw 'The published release is not marked as latest.' }
    if ($release.immutable) { Invoke-Native gh @('release', 'verify', $Tag, '--repo', $Repository) | Out-Host }
    Write-Output "Published $($release.html_url) from $commit"
} finally {
    Pop-Location
}
