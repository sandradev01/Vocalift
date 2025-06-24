from df.enhance import enhance
import os

def clean_audio(input_path, output_path):
    # Enhance audio
    enhance(input_path=input_path, output_path=output_path)

if __name__ == "__main__":
    input_file = "samples/noisy_audio.wav"
    output_file = "samples/cleaned_audio.wav"
    clean_audio(input_file, output_file)
    print("Done! Cleaned audio saved to:", output_file)
