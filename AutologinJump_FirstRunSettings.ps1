
function firstRun {

#prompt for jump username
$JumpUserName = Read-Host -Prompt "Otis account name e.g   masaryk"

$Accounta= $JumpUserName + "-a"
Write-Host " Write Y if your account has name like 'otis.com\myname-a', for most admins default is N."
Write-Host " Write N if your account has name like 'myname-a'"

$choices = New-Object Collections.ObjectModel.Collection[Management.Automation.Host.ChoiceDescription]
$choices.Add((New-Object Management.Automation.Host.ChoiceDescription -ArgumentList '&Yes'))
$choices.Add((New-Object Management.Automation.Host.ChoiceDescription -ArgumentList '&No'))

$decision = $Host.UI.PromptForChoice($title, $question, $choices, 1)
if ($decision -eq 0) {
    Write-Host 'confirmed'
    $Accounta=  "otis.com" +"\" + $JumpUserName + "-a"
} else {
    Write-Host 'cancelled'
}

#add @otis to name
$JumpUsernames= $JumpUserName + "@otis.com"
#get current path
$pathget = Split-Path $script:MyInvocation.MyCommand.Path
$b = $pathget + "\test\User Data"
$foldernamme= $b.replace('\','\\')

$c = $pathget + "\Autologin.exe"

#get credentials
$Wiwname= Read-Host -Prompt "Enter wiw name"
$Wiwpass1= Read-Host -Prompt "Enter wiw pass" -AsSecureString  
$Wiwpass = [System.Net.NetworkCredential]::new("", $Wiwpass1).Password 

$filePath = "$pathget" +"\AutoLoginJump.txt"

$filePath1 = "$pathget" +"\AutoLoginJumpo.json"

Remove-Item $FilePath1 -Recurse -ErrorAction Ignore

$tempFilePath = "$env:TEMP\$($filePath | Split-Path -Leaf)"
$find = 'JumpLoginName'

$findwiwname='wiwusername'
$findwiwpass='wiwpassword'
$finddir="profiledirectory"
$findname='masaryk-a'

#Edit File with credentials
(Get-Content -Path $filePath) -replace $findwiwname, $Wiwname -replace $finddir, $foldernamme  -replace $findwiwpass, $Wiwpass -replace $find, $JumpUserNames -replace $findname, $Accounta | Add-Content -Path $tempFilePath

Move-Item -Path $tempFilePath -Destination $filePath1


$ChromeNumber= Read-Host -Prompt "Please press 1 if you have Google Chrome version 90 or press 2 for Google Chrome version 92
 Version info you can find by typing in chrome browser this: chrome://version "

if ($ChromeNumber -eq 1) {
$content = Get-Content -Path settings.ini
$content[1] = "path = driver\chromedriver.exe"
$content | Set-Content -Path settings.ini
} 
if ($ChromeNumber -eq 2) {
$content = Get-Content -Path settings.ini
$content[1] = "path = driver\chromedriver_92.exe"
$content | Set-Content -Path settings.ini
  }


                    }

function CreateShortcut {
#Function to create shortcut on desktop
$pathget1 = Split-Path $script:MyInvocation.MyCommand.Path
$TargetPath = $pathget1 + "\Autologin.exe"
$TargetPath
$ShortcutFile = "$Home\Desktop\AutologinJump.lnk"
$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($ShortcutFile)
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = $pathget1
$Shortcut.Save()
exit

                        }

function SecondRun {
#Decrypt file with password

$fileToCheck = "AutologinJumpo.zip"
if (Test-Path $fileToCheck -PathType leaf)
{
    $7ZipPath = '"C:\Program Files\7-Zip\7z.exe"'
$zipFile = '"AutoLoginJumpo.zip"'
$zipFilePassword = Read-Host -Prompt "Insert pw of zip file"
$command = "& $7ZipPath e -y -tzip -p$zipFilePassword $zipFile"
iex $command
}


Remove-Item "AutologinJumpo.zip"







}







function Write-ZipUsing7Zip([string]$FilesToZip, [string]$ZipOutputFilePath, [string]$Password, [ValidateSet('7z','zip','gzip','bzip2','tar','iso','udf')][string]$CompressionType = 'zip', [switch]$HideWindow)
{
    # Look for the 7zip executable.
    
    $pathTo64Bit7Zip = "C:\Program Files\7-Zip\7z.exe"
 
    $pathToStandAloneExe = "C:\Program Files\7-Zip\7z.exe"
    if (Test-Path $pathTo64Bit7Zip) { $pathTo7ZipExe = $pathTo64Bit7Zip }
    elseif (Test-Path $pathTo32Bit7Zip) { $pathTo7ZipExe = $pathTo32Bit7Zip }
    elseif (Test-Path $pathToStandAloneExe) { $pathTo7ZipExe = $pathToStandAloneExe }
    else { throw "Could not find the 7-zip executable." }

    # Delete the destination zip file if it already exists (i.e. overwrite it).
    if (Test-Path $ZipOutputFilePath) { Remove-Item $ZipOutputFilePath -Force }

    $windowStyle = "Normal"
    if ($HideWindow) { $windowStyle = "Hidden" }

  
    $arguments = "a -t$CompressionType ""$ZipOutputFilePath"" ""$FilesToZip"" -mx9"
    if (!([string]::IsNullOrEmpty($Password))) { $arguments += " -p$Password" }

    # Zip up the files.
    $p = Start-Process $pathTo7ZipExe -ArgumentList $arguments -Wait -PassThru -WindowStyle $windowStyle

    # If the files were not zipped successfully.
    if (!(($p.HasExited -eq $true) -and ($p.ExitCode -eq 0)))
    {
        throw "There was a problem creating the zip file '$ZipFilePath'."
    }
}





do {
#set execution policy 
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

#Main Program, function calling with numbers
cls
Write-Host  "
    Curent Version v1.2
[Changelog] v 1.1 script creation for Selenium IDE 
            v 1.2 script creation for Selenium IDE edited for working with Python
            change for nucleus users, script was optimized.

   Script created by Miroslav Masaryk 


"
Start-Sleep -s 3

cls
Write-Host  "
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ 1 First run settings                                        +
+ 2 Decrypt the file                                          +
+ 3 Encrypt the file                                          +
+ 4 Quit the app                                              +
++++++++++++++++++++++++++Login Menu ++++++++++++++++++++++++++  
"

$MenuNumber= Read-Host -Prompt "Enter Number"

IF ($MenuNumber -eq '1') {
    FirstRun 
    CreateShortcut
}

IF ($MenuNumber -eq '2') {
    SecondRun
}


IF ($MenuNumber -eq '3') {
    $passwordencrypt = Read-Host -Promt "Please insert any pw" 
    Write-ZipUsing7Zip "AutologinJumpo.json" "AutoLoginJumpo.zip" -Password $passwordencrypt
    Remove-Item "AutologinJumpo.json" 
}


  if ($MenuNumber -gt '4') {
    cls
    Write-Host 'Bad Number try again'
    Start-Sleep -s 3
}


}while ( $MenuNumber -ne 4)



