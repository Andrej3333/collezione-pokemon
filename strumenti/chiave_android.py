"""Crea la chiave di firma dell'app Android a partire da una parola segreta.

La stessa parola segreta da sempre la stessa chiave: cosi ogni nuova versione
dell'app e firmata allo stesso modo e Android la installa sopra la precedente.
La parola segreta sta solo nei segreti di GitHub (ANDROID_FIRMA), mai nel codice.

Uso: ANDROID_FIRMA=... python strumenti/chiave_android.py <file.p12>
Scrive il file della chiave e stampa la password del file per Gradle.
"""

import datetime as dt
import hashlib
import os
import sys

from Crypto.PublicKey import RSA
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID

ALIAS = b"collezione"


def flusso(seme: bytes):
    """Byte pseudo-casuali ma ripetibili, ricavati dal seme."""
    contatore = 0
    riserva = b""

    def leggi(n: int) -> bytes:
        nonlocal contatore, riserva
        while len(riserva) < n:
            riserva += hashlib.sha512(seme + contatore.to_bytes(8, "big")).digest()
            contatore += 1
        out, riserva = riserva[:n], riserva[n:]
        return out
    return leggi


def main():
    segreto = os.environ.get("ANDROID_FIRMA", "")
    if len(segreto) < 8:
        print("Manca il segreto ANDROID_FIRMA (almeno 8 caratteri) nelle impostazioni del repository.", file=sys.stderr)
        sys.exit(1)
    destinazione = sys.argv[1]
    seme = hashlib.pbkdf2_hmac("sha256", segreto.encode(), b"collezione-pokemon-android", 300_000, 64)
    password = hashlib.sha256(seme + b"password").hexdigest()[:32]

    chiave_rsa = RSA.generate(2048, randfunc=flusso(seme))
    chiave = serialization.load_der_private_key(chiave_rsa.export_key(format="DER"), password=None)
    nome = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Collezione Pokemon")])
    certificato = (
        x509.CertificateBuilder()
        .subject_name(nome)
        .issuer_name(nome)
        .public_key(chiave.public_key())
        .serial_number(int.from_bytes(hashlib.sha256(seme + b"serie").digest()[:16], "big") >> 1)
        .not_valid_before(dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc))
        .not_valid_after(dt.datetime(2076, 1, 1, tzinfo=dt.timezone.utc))
        .sign(chiave, hashes.SHA256())
    )
    with open(destinazione, "wb") as f:
        f.write(pkcs12.serialize_key_and_certificates(
            ALIAS, chiave, certificato, None, serialization.BestAvailableEncryption(password.encode())))
    impronta = certificato.fingerprint(hashes.SHA256()).hex(":")
    print(f"impronta del certificato (SHA-256): {impronta}", file=sys.stderr)
    print(password)


if __name__ == "__main__":
    main()
