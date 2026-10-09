Option Explicit
Dim shell, files, root, nodePath
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
root = files.GetParentFolderName(files.GetParentFolderName(WScript.ScriptFullName))
shell.CurrentDirectory = root
nodePath = "node.exe"
If WScript.Arguments.Count > 0 Then nodePath = WScript.Arguments(0)
shell.Run Chr(34) & nodePath & Chr(34) & " " & Chr(34) & root & "\scripts\start-local.mjs" & Chr(34), 0, False
