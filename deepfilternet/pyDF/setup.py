from setuptools import setup
from setuptools_rust import RustExtension

setup(
    name="libdf",
    version="0.1.0",
    rust_extensions=[
        RustExtension(
            "libdf",
            path="pyDF/Cargo.toml",
            binding="pyo3",
            debug=False,
        )
    ],
    packages=["libdf"],
    zip_safe=False,
)
