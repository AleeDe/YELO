$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$dashboardEnv = Join-Path $repoRoot "apps\dashboard\.env.local"

if (-not (Test-Path -LiteralPath $dashboardEnv)) {
    throw "Missing apps/dashboard/.env.local. Configure Supabase first."
}

$values = @{}
Get-Content -LiteralPath $dashboardEnv | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
        return
    }
    $separator = $line.IndexOf("=")
    if ($separator -gt 0) {
        $values[$line.Substring(0, $separator)] = $line.Substring($separator + 1)
    }
}

$env:SUPABASE_URL = $values["NEXT_PUBLIC_SUPABASE_URL"]
$env:SUPABASE_ANON_KEY = $values["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_ANON_KEY) {
    throw "Supabase URL or anon key is missing from apps/dashboard/.env.local."
}

Set-Location -LiteralPath $repoRoot
python services/inference/server.py
