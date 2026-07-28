' VideoDoc silent launcher.
' Runs VideoDoc.bat without a visible console window. The llama.cpp engine
' keeps running in the background; closing the browser tab does NOT stop it —
' use the "Stop VideoDoc" shortcut (or Task Manager -> llama-server.exe) to quit.
Set sh = CreateObject("WScript.Shell")
here = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
sh.CurrentDirectory = here
sh.Run """" & here & "VideoDoc.bat""", 0, False
