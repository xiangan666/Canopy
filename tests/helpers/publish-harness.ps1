param([Parameter(Mandatory)][string]$ProjectRoot)

$ErrorActionPreference = 'Stop'
$global:fakeState = Get-Content -LiteralPath $env:CANOPY_TEST_RELEASE_STATE -Raw | ConvertFrom-Json
$global:fakeCommit = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

# Exercise the real publisher and build against a local GitHub boundary.
function global:git {
    $global:LASTEXITCODE = 0
    switch ($args[0]) {
        'status' { return }
        'rev-parse' { return $global:fakeCommit }
        'archive' {
            $output = ($args | Where-Object { $_ -like '--output=*' }).Substring(9)
            [System.IO.File]::WriteAllText($output, 'fixture source archive')
            return
        }
        default { throw "Unexpected git call: $args" }
    }
}

function global:gh {
    $call = @($args)
    [System.IO.File]::AppendAllText($env:CANOPY_TEST_RELEASE_CALLS, (ConvertTo-Json -InputObject $call -Compress) + "`n")
    $global:LASTEXITCODE = 0
    if ($call[0] -eq 'release') {
        switch ($call[1]) {
            'view' {
                if ($global:fakeState.lookupError) {
                    $global:LASTEXITCODE = 1
                    return 'HTTP 503: service unavailable'
                }
                if (-not $global:fakeState.exists) {
                    $global:LASTEXITCODE = 1
                    return 'release not found'
                }
                return '{"databaseId":12345}'
            }
            'create' {
                $global:fakeState.exists = $true
                $global:fakeState.draft = $true
                return
            }
            'upload' {
                $assets = foreach ($argument in $call) {
                    if (Test-Path -LiteralPath $argument -PathType Leaf) {
                        $file = Get-Item -LiteralPath $argument
                        $stored = Join-Path $env:CANOPY_TEST_RELEASE_STORE $file.Name
                        Copy-Item -LiteralPath $file.FullName -Destination $stored -Force
                        [pscustomobject]@{
                            name = $file.Name
                            size = $file.Length
                            digest = 'sha256:' + (Get-FileHash -LiteralPath $stored -Algorithm SHA256).Hash.ToLowerInvariant()
                        }
                    }
                }
                $global:fakeState.assets = @($assets)
                return
            }
            'edit' {
                if ($call -contains '--draft=false') {
                    $global:fakeState.draft = $false
                    $global:fakeState.published_at = '2026-01-01T00:00:00Z'
                }
                return
            }
            'download' {
                $destination = $call[([array]::IndexOf($call, '--dir') + 1)]
                foreach ($asset in $global:fakeState.assets) {
                    $download = Join-Path $destination $asset.name
                    Copy-Item -LiteralPath (Join-Path $env:CANOPY_TEST_RELEASE_STORE $asset.name) -Destination $download
                    if ($global:fakeState.corruptDownloads) { [System.IO.File]::AppendAllText($download, 'corrupt') }
                }
                return
            }
            default { throw "Unexpected gh release call: $call" }
        }
    }
    if ($call[0] -eq 'api') {
        $endpoint = $call[1]
        if ($endpoint -like '*/commits/*') { return $global:fakeCommit }
        if ($endpoint -like '*/releases/tags/*') {
            # GitHub's tag endpoint omits the existing draft.
            if ($global:fakeState.draft -or -not $global:fakeState.exists) {
                $global:LASTEXITCODE = 1
                return 'gh: Not Found (HTTP 404)'
            }
        } elseif ($endpoint -like '*/releases/latest') {
            return 'v' + (Get-Content -LiteralPath (Join-Path $ProjectRoot 'package.json') -Raw | ConvertFrom-Json).version
        } elseif ($endpoint -notlike '*/releases/12345') {
            throw "Unexpected gh api endpoint: $endpoint"
        }
        return ConvertTo-Json -Depth 5 -Compress -InputObject ([ordered]@{
            draft = $global:fakeState.draft
            prerelease = $false
            published_at = $global:fakeState.published_at
            assets = @($global:fakeState.assets)
            immutable = $false
            html_url = 'https://example.invalid/release'
        })
    }
    throw "Unexpected gh call: $call"
}

try {
    & (Join-Path $ProjectRoot 'tools/publish.ps1')
} finally {
    [System.IO.File]::WriteAllText($env:CANOPY_TEST_RELEASE_STATE, (ConvertTo-Json -InputObject $global:fakeState -Depth 5))
}
