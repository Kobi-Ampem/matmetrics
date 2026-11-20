"""A self-signed HTTPS certificate for the laptop's Wi-Fi address.

Browsers only let a page open the camera over HTTPS (or on localhost). Phones reach the edge
server by its Wi-Fi address, so the camera page needs HTTPS. There is no internet at the club,
so no public certificate authority can be used; the server signs its own. Each phone shows a
one-time warning that the user taps through.
"""

import ipaddress
from datetime import UTC, datetime, timedelta
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID


def ensure_certificate(folder: Path, ip: str) -> tuple[Path, Path]:
    """Return (cert, key) paths, making a new pair if none exists for this address."""
    folder.mkdir(parents=True, exist_ok=True)
    cert_path = folder / "edge-cert.pem"
    key_path = folder / "edge-key.pem"
    if cert_path.is_file() and key_path.is_file() and _covers(cert_path, ip):
        return cert_path, key_path

    key = ec.generate_private_key(ec.SECP256R1())
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "MatMetrics Edge 01")])
    now = datetime.now(UTC)
    # Browsers check the subject alternative names, not the common name.
    names = x509.SubjectAlternativeName(
        [
            x509.DNSName("localhost"),
            x509.IPAddress(ipaddress.ip_address("127.0.0.1")),
            x509.IPAddress(ipaddress.ip_address(ip)),
        ]
    )
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(days=1))
        .not_valid_after(now + timedelta(days=365))
        .add_extension(names, critical=False)
        .sign(key, hashes.SHA256())
    )
    key_path.write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    key_path.chmod(0o600)
    cert_path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    return cert_path, key_path


def _covers(cert_path: Path, ip: str) -> bool:
    """True if the saved certificate is still valid and names this Wi-Fi address.

    The laptop gets a different address on a different network (school Wi-Fi, a hotspot),
    so the certificate is remade when the address changes.
    """
    cert = x509.load_pem_x509_certificate(cert_path.read_bytes())
    if cert.not_valid_after_utc < datetime.now(UTC) + timedelta(days=1):
        return False
    names = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
    return ipaddress.ip_address(ip) in names.get_values_for_type(x509.IPAddress)
