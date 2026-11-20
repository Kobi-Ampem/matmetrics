"""Finding the address phones on the same Wi-Fi can reach, and a QR code for it."""

import socket

import segno


def lan_ip() -> str:
    """The laptop's address on the local network, or 127.0.0.1 if there is none.

    Connecting a UDP socket sends no packets; it only asks the OS which interface it would
    use, which is the one other devices on the Wi-Fi can reach.
    """
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
        try:
            probe.connect(("10.255.255.255", 1))
            return probe.getsockname()[0]
        except OSError:
            return "127.0.0.1"


def join_url(port: int, path: str = "/athlete") -> str:
    return f"http://{lan_ip()}:{port}{path}"


def qr_svg(url: str) -> str:
    return segno.make(url, error="m").svg_inline(scale=6, dark="#0F1419", light="#FFFFFF")
