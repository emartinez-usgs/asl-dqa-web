#!/bin/bash

chmod +x html/cgi-bin/*.py
chmod 755 html/cgi-bin/*.py

cd bin
pwd | tr -d '\n' > ../html/cgi-bin/settings.txt
echo "/" >> ../html/cgi-bin/settings.txt
