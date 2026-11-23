#!/usr/bin/env python3
import os
import ssl
import json
import base64
import argparse
import tempfile
import subprocess
import urllib.request as http
from urllib.parse import urlparse


def ssl_context(cert: str = None, key: str = None) -> object:
    """ SSL context creator
    """
    # create default SSL context
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    if cert and key:
        ctx.load_cert_chain(cert, key, password='client')

    return ctx


def openssl_sign(data: str, keyfile: str) -> tuple[str, str]:
    return subprocess.run(
        f'openssl dgst -sha256 -sign {keyfile} {data} | openssl base64',
        shell=True,
        check=True,
        stdout=subprocess.PIPE
    ).stdout.decode().replace('\n', ''), 'RSA-SHA256'


def openssl_verify(
    url: str,
    signature: str,
    body: bytes,
    s_sig_key: str
) -> bool:
    """ Verify digital signature using remote host's public key

    """
    with tempfile.TemporaryDirectory() as tmpdir:
        signpath = os.path.join(tmpdir, 'signature')
        datpath = os.path.join(tmpdir, 'payload')

        if s_sig_key:
            pubkeypath = s_sig_key
            cmd = (
                f'openssl dgst -sha256 -verify {pubkeypath}'
                f' -signature {signpath} {datpath}'
            )
        else:
            urlparts = urlparse(url)

            # do not set port if it is already there
            if not urlparts.port:
                netloc = f'{urlparts.netloc}:443'
            else:
                netloc = urlparts.netloc

            pubkeypath = os.path.join(tmpdir, 'public.key')
            cmd = (
                f'openssl s_client -connect {netloc}'
                f' | openssl x509 -pubkey -noout > {pubkeypath}'
                f' && openssl dgst -sha256 -verify {pubkeypath}'
                f' -signature {signpath} {datpath}'
            )

        with open(signpath, 'wb') as signfile:
            signfile.write(base64.b64decode(signature))

        with open(datpath, 'wb') as datfile:
            datfile.write(body)

        # verify the digital signature
        try:
            subprocess.run(
                cmd,
                check=True,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL
            )
        except subprocess.CalledProcessError:
            return False

    return True


def send(args: dict) -> tuple:
    with open(args.data, 'r') as data:
        payload = data.read()

    # guess the content type from data
    try:
        json.loads(payload)
        ctype = 'application/json'
    except Exception:
        ctype = 'application/xml'

    # create SSL context if the protocol is HTTPS
    if args.url.startswith('https://'):
        ssl_ctx = ssl_context(args.cert, args.key)
    else:
        ssl_ctx = None

    # sign the request if the key is specified
    if args.key:
        signature, algorithm = openssl_sign(args.data, args.key)
    else:
        signature = algorithm = ''

    response = http.urlopen(
        http.Request(
            args.url,
            payload.encode(),
            headers={
                'Content-Type': ctype,
                'X-Signature': signature,
                'X-Signature-Algorithm': algorithm
            }
        ),
        context=ssl_ctx
    )

    headers = response.headers
    body = response.read()
    response.close()

    return headers, body.decode(), openssl_verify(
        args.url,
        headers.get('X-Signature'),
        body,
        args.s_sig_key
    )


if __name__ == '__main__':
    cmd_parser = argparse.ArgumentParser('CLI client for Vishup')
    cmd_parser.add_argument(
        'url',
        help='full URL'
    )

    cmd_parser.add_argument(
        '-d',
        '--data',
        required=True,
        help='path to the data file'
    )

    cmd_parser.add_argument(
        '-c',
        '--cert',
        help='path to client certificate'
    )

    cmd_parser.add_argument(
        '-k',
        '--key',
        help='path to client key'
    )

    cmd_parser.add_argument(
        '-s',
        '--s-sig-key',
        help="public key of server's signature"
    )

    headers, body, sig_ok = send(cmd_parser.parse_args())

    print('Signature Algorithm\n-------------------')
    if 'X-Signature-Algorithm' not in headers:
        print('Missing\n')
    elif (algo := headers['X-Signature-Algorithm']) != 'RSA-SHA256':
        print('Invalid [', algo, ']\n')
    else:
        print('Valid\n')

    print('Signature\n---------')
    if sig_ok:
        print('Valid\n')
    else:
        print('Invalid\n')

    print('Headers\n-------')
    for k, v in headers.items():
        print(k, ': ', v, sep='')

    print('\nBody\n----\n', body, sep='')
