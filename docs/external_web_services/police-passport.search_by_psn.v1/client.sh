#!/bin/bash

# exit when any command fails
set -eu -o pipefail


usage()
{
    echo 'Grape GIP client'
    echo 'usage: ./grape.sh -u|--url URL -k|--key KEYFILE -c|--cert CERTFILE -d|--data JSONFILE [-v|--verbose] [-h|--help]'
    echo
    echo 'optional arguments:'
    echo '  -h, --help                         display help message'
    echo '  -u, --url  URL                     Vishup URL address'
    echo '  -k, --key  KEYFILE                 path to PEM key file'
    echo '  -c, --cert CERTFILE                path to PEM certificate file'
    echo '  -d, --data DATAFILE                file path of JSON encoded data'
    echo '  -v, --verbose                      output verbosity'
}


error()
{
    echo "error: $1"
    echo 'usage: ./grape.sh -u|--url URL -k|--key KEYFILE -c|--cert CERTFILE -d|--data JSONFILE [-v|--verbose] [-h|--help]'
    exit 1
}


# ------------------------ Main ------------------------

# define required parameters
url=''
keyfile=''
certfile=''
datafile=''
verbose='-s'

# parse command line arguments
while [ $# -ge 1 ] && [ "$1" != "" ]; do
    case $1 in
        -u | --url) shift
            url=$1
            if [ -z "$url" ]; then
                error 'empty URL' 
            fi
            ;;
        -k | --key) shift
            keyfile=$1
            if [ ! -f "$keyfile" ] ; then
                error 'private key file not found'
            fi
            ;;
        -c | --cert) shift
            certfile=$1
            if [ ! -f "$certfile" ] ; then
                error 'certificate file not found' 
            fi
            ;;
        -d | --data) shift
            datafile=$1
            if [ ! -f "$datafile" ] ; then
                error 'file containing JSON encoded data not found' 
            fi
            ;;
        -v | --verbose)
            verbose=''
            ;;
        -h | --help)
            usage
            exit 0
            ;;
        *) usage
            exit 0
            ;;
    esac
    shift
done

# check for required command line arguments
if [ -z "$url" ] || [ -z "$certfile" ] || [ -z "$keyfile" ] || [ -z "$datafile" ]; then
    error 'URL, private key, certificate and request data are required'
fi

# remove trailing newline at the end of the data file if any found
printf %s "$(< "$datafile")" > "$datafile"

# compute digital signature of the payload
signature=$(openssl dgst -sha256 -sign "$keyfile" "$datafile" | openssl base64 -A)

# send request and print response headers and payload
# echo is used to display unicode messages
echo -e "$(
    curl \
        -i "$verbose" \
        -X POST \
        --insecure \
        --key "$keyfile" \
        --cert "$certfile" \
        -H "Content-Type: application/json" \
        -H "X-Signature-Algorithm: RSA-SHA256" \
        -H "X-Signature: $signature" \
        --data-binary "@$datafile" \
        "$url"
)"
