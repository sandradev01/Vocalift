from setuptools import setup, find_packages

setup(
    name="deepfilternet",
    version="0.1.0",
    packages=find_packages(include=["df", "df.*"]),
    install_requires=[
        "torch",
        "numpy",
        # add your other deps here
    ],
)
