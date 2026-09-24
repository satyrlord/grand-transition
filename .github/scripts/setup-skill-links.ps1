[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repositoryRoot = [System.IO.Path]::GetFullPath(
  (Join-Path $PSScriptRoot '..\..')
)
$canonicalSkills = [System.IO.Path]::GetFullPath(
  (Join-Path $repositoryRoot '.github\skills')
)

if (-not $canonicalSkills.StartsWith(
    $repositoryRoot,
    [System.StringComparison]::OrdinalIgnoreCase
  )) {
  throw 'The primary skill directory is outside the repository.'
}

if (-not (Test-Path -LiteralPath $canonicalSkills -PathType Container)) {
  throw 'The primary skill directory is missing.'
}

foreach ($discoveryRootName in '.agents', '.codex') {
  $discoveryRoot = Join-Path $repositoryRoot $discoveryRootName
  $skillLink = Join-Path $discoveryRoot 'skills'

  if (-not (Test-Path -LiteralPath $discoveryRoot)) {
    New-Item -ItemType Directory -Path $discoveryRoot | Out-Null
  }

  if (Test-Path -LiteralPath $skillLink) {
    $existing = Get-Item -Force -LiteralPath $skillLink
    $resolved = [System.IO.Path]::GetFullPath(
      [string]$existing.Target
    )

    if ($existing.LinkType -ne 'Junction' -or $resolved -ne $canonicalSkills) {
      throw "A different item is at the skill link path: $skillLink"
    }

    Write-Output "The skill link target is correct: $skillLink"
    continue
  }

  New-Item -ItemType Junction -Path $skillLink -Target $canonicalSkills |
    Out-Null
  Write-Output "Made the skill link: $skillLink"
}
