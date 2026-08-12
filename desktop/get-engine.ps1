# VideoDoc desktop, one time setup.
# Downloads the llama.cpp server (Vulkan build: NVIDIA, AMD and Intel graphics,
# CPU fallback) and a gemma 3 vision model.
# Sources are official: github.com/ggml-org and huggingface.co/ggml-org.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File get-engine.ps1            # 4B model (default, fast, ~4 GB)
#   powershell -ExecutionPolicy Bypass -File get-engine.ps1 -Model 12b # 12B model (slower, reads dense UIs far better, ~8 GB)
#
# The 12B model is the recommended upgrade when the 4B model misreads a dense
# enterprise UI and invents plausible-but-wrong labels. It runs on the same
# machine via llama.cpp CPU/GPU offload — nothing leaves the device.
param(
    [ValidateSet("4b", "12b")]
    [string]$Model = "4b"
)
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

New-Item -ItemType Directory -Force "$here\llama"  | Out-Null
New-Item -ItemType Directory -Force "$here\models" | Out-Null

# Per-model download details. Both live in official ggml-org GGUF repos.
if ($Model -eq "12b") {
    $repo       = "gemma-3-12b-it-qat-GGUF"
    $modelFile  = "gemma-3-12b-it-qat-Q4_0.gguf"
    $mmprojFile = "mmproj-model-f16-12B.gguf"
    $modelSize  = "about 7 GB"
    $mmprojSize = "about 850 MB"
} else {
    $repo       = "gemma-3-4b-it-qat-GGUF"
    $modelFile  = "gemma-3-4b-it-qat-Q4_0.gguf"
    $mmprojFile = "mmproj-model-f16.gguf"
    $modelSize  = "about 3.2 GB"
    $mmprojSize = "about 850 MB"
}

# 1) llama.cpp server, latest release, Windows Vulkan x64 build
if (-not (Test-Path "$here\llama\llama-server.exe")) {
    Write-Host "[1/4] Finding the latest llama.cpp release..."
    $rel = Invoke-RestMethod "https://api.github.com/repos/ggml-org/llama.cpp/releases/latest"
    $asset = $rel.assets | Where-Object { $_.name -match "bin-win-vulkan-x64\.zip$" } | Select-Object -First 1
    if (-not $asset) { throw "No win-vulkan-x64 asset found. Check https://github.com/ggml-org/llama.cpp/releases" }
    Write-Host "      Downloading $($asset.name) ($([math]::Round($asset.size/1MB)) MB)..."
    Invoke-WebRequest $asset.browser_download_url -OutFile "$here\llama.zip"
    Expand-Archive "$here\llama.zip" -DestinationPath "$here\llama" -Force
    Remove-Item "$here\llama.zip"
    # some releases nest the binaries in a subfolder, flatten if so
    $exe = Get-ChildItem "$here\llama" -Recurse -Filter "llama-server.exe" | Select-Object -First 1
    if ($exe -and $exe.DirectoryName -ne "$here\llama") {
        Move-Item "$($exe.DirectoryName)\*" "$here\llama" -Force
    }
    Write-Host "      Engine ready."
} else { Write-Host "[1/4] Engine already present, skipping." }

# 2) the gemma 3 model (QAT Q4_0, quality close to full precision at a quarter of the size)
$model = "$here\models\$modelFile"
if (-not (Test-Path $model)) {
    Write-Host "[2/4] Downloading the gemma 3 $Model model ($modelSize, this takes a while)..."
    Invoke-WebRequest "https://huggingface.co/ggml-org/$repo/resolve/main/$modelFile" -OutFile $model
} else { Write-Host "[2/4] Model ($modelFile) already present, skipping." }

# 3) vision projector, required so the model can see screenshots
$mmproj = "$here\models\$mmprojFile"
if (-not (Test-Path $mmproj)) {
    Write-Host "[3/4] Downloading the vision projector ($mmprojSize)..."
    Invoke-WebRequest "https://huggingface.co/ggml-org/$repo/resolve/main/$mmprojFile" -OutFile $mmproj
} else { Write-Host "[3/4] Vision projector ($mmprojFile) already present, skipping." }

# 4) the Whisper speech model, served from inside app\ so transcription never
# calls Hugging Face. Without this the first transcription needs internet.
$whisper = "$here\app\models\Xenova\whisper-small.en"
$whisperBase = "https://huggingface.co/Xenova/whisper-small.en/resolve/main"
$whisperFiles = @(
    "config.json", "generation_config.json", "preprocessor_config.json",
    "tokenizer.json", "tokenizer_config.json", "special_tokens_map.json",
    "added_tokens.json", "normalizer.json", "vocab.json",
    "onnx/encoder_model.onnx", "onnx/decoder_model_merged.onnx"
)
if (-not (Test-Path "$whisper\onnx\decoder_model_merged.onnx")) {
    Write-Host "[4/4] Downloading the Whisper speech model (~970 MB)..."
    New-Item -ItemType Directory -Force "$whisper\onnx" | Out-Null
    foreach ($f in $whisperFiles) {
        Invoke-WebRequest "$whisperBase/$f" -OutFile "$whisper\$($f -replace '/', '\')"
    }
} else { Write-Host "[4/4] Whisper model already present, skipping." }

Write-Host ""
Write-Host "Setup complete ($Model model). Start VideoDoc with VideoDoc.bat"
if ($Model -eq "12b") {
    Write-Host "VideoDoc.bat will auto-detect the 12B model and load it. First generation"
    Write-Host "is slower than 4B (larger model, partial GPU offload) but reads dense UIs"
    Write-Host "far more accurately."
}
