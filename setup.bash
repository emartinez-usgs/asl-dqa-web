#!/usr/bin/env bash

# This sets up the project virtual environment

VENV=venv

echo "Removing any old virtual environment"
rm -rf ${VENV}

echo "Setting up virtualenv"
virtualenv -p python3 ${VENV}

# Update PYTHON modules from requirements.txt, make sure PIP is up-to-date
source ${VENV}/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
