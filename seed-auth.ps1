# seed-auth.ps1 - Sets up demo user passwords via Supabase Admin API
# Run this AFTER `supabase db reset --linked` to ensure auth.identities are created
# GoTrue requires identity records for email/password login to work

$projectRef = "dtpfsbgicmiqcqdepmfb"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0cGZzYmdpY21pcWNxZGVwbWZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDc5ODU3OCwiZXhwIjoyMDg2Mzc0NTc4fQ.ACu4ZMq2PBXKGLqW9ERyjT-64E0aosKYQKFeBbZz0hQ"
$baseUrl = "https://$projectRef.supabase.co"

$headers = @{
    "apikey"        = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type"  = "application/json"
}

# Demo user credentials
$users = @(
    @{ email = "anas.essam.work@gmail.com"; password = "admin123"; role = "admin" },
    @{ email = "essamanas86@gmail.com";     password = "Hr1234";   role = "hr" },
    @{ email = "tvissam96@gmail.com";       password = "emp123";   role = "staff" }
)

Write-Host "`n--- Seeding Auth Users ---" -ForegroundColor Cyan

# Get existing users
$response = Invoke-RestMethod -Uri "$baseUrl/auth/v1/admin/users" -Method GET -Headers $headers
$existingUsers = $response.users

foreach ($user in $users) {
    $existing = $existingUsers | Where-Object { $_.email -eq $user.email }
    
    if ($existing) {
        # Update password (this also creates auth.identities if missing)
        $body = @{ password = $user.password } | ConvertTo-Json
        try {
            $r = Invoke-RestMethod -Uri "$baseUrl/auth/v1/admin/users/$($existing.id)" -Method PUT -Headers $headers -Body $body
            Write-Host "[OK] $($user.email) ($($user.role)) - password set, identities: $($r.identities.Count)" -ForegroundColor Green
        }
        catch {
            Write-Host "[FAIL] $($user.email) - $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
    else {
        Write-Host "[SKIP] $($user.email) - user not found in auth.users" -ForegroundColor Yellow
    }
}

# Verify login works
Write-Host "`n--- Verifying Logins ---" -ForegroundColor Cyan
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0cGZzYmdpY21pcWNxZGVwbWZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3OTg1NzgsImV4cCI6MjA4NjM3NDU3OH0.ChWwRJtKWAycoX10QKDWq9Mn33Ndv59vs5KMmZbREa8"
$loginHeaders = @{ "apikey" = $anonKey; "Content-Type" = "application/json" }

foreach ($user in $users) {
    $body = @{ email = $user.email; password = $user.password } | ConvertTo-Json
    try {
        $r = Invoke-RestMethod -Uri "$baseUrl/auth/v1/token?grant_type=password" -Method POST -Headers $loginHeaders -Body $body
        Write-Host "[OK] $($user.email) - login successful" -ForegroundColor Green
    }
    catch {
        Write-Host "[FAIL] $($user.email) - login failed: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host "`n--- Done ---`n" -ForegroundColor Cyan
