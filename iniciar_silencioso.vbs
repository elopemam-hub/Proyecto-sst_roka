Set WshShell = CreateObject("WScript.Shell")

WshShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Minimized -File ""C:\xampp\htdocs\sst_roka\iniciar_backend_loop.ps1""", 2, False

WScript.Sleep 6000

WshShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Minimized -File ""C:\xampp\htdocs\sst_roka\iniciar_frontend_loop.ps1""", 2, False

WScript.Sleep 8000

WshShell.Run "http://localhost:3000", 1, False