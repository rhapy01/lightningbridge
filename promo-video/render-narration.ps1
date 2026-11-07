$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech

$voice = [System.Speech.Synthesis.SpeechSynthesizer]::new()
try {
  $voice.SelectVoice('Microsoft David Desktop')
  $voice.Rate = -1
  $voice.Volume = 94
  $voice.SetOutputToWaveFile((Join-Path $PSScriptRoot 'narration.wav'))

  $paragraphs = (Get-Content (Join-Path $PSScriptRoot 'narration.txt') -Raw) -split '\r?\n\s*\r?\n' | Where-Object { $_.Trim() }
  $body = foreach ($paragraph in $paragraphs) {
    '<p><s>' + [System.Security.SecurityElement]::Escape($paragraph.Trim()) + '</s></p><break time="300ms" />'
  }
  $ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="Microsoft Zira">' + ($body -join '') + '</voice></speak>'
  $voice.SpeakSsml($ssml)
} finally {
  $voice.Dispose()
}
