$base = (Get-Location).Path

Get-ChildItem -Path $base -Recurse -Force |
Where-Object { $_.FullName -notmatch "node_modules" } |
ForEach-Object {
    $relative = $_.FullName.Replace($base, "")
    $level = ($relative -split "[\\/]").Count - 1
    (" " * ($level * 2)) + "|-- " + $_.Name
} | Out-File "structure.txt"