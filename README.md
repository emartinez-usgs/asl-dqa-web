# asl-dqa-web
This is the frontend that displays data found in a DQA database.

### Updating to Latest Release from pre 1.3.0 releases
```bash
# As the website owner, NOT root (internally this is asluser)
# cd into installation directory
# Remove previous custom configurations
git stash
git stash drop
git checkout master
git pull

# Configure the settings file in html/cgi-bin to point to correct Database.py
bash setup.bash

#Restart apache
sudo apachectl restart
```

### Initial Setup
- Python CGI must be enabled on the web server
- psycopg2-binary module must be installed.

###### Python
Run setup.bash in the correct folder to set the bin directory for database access

###### Example Apache conf using cgid
Other modules besides cgid could be used, but this example is limited to cgid.
Enable cgid by executing:
```
sudo a2enmod cgid
```
Use the below apache conf, also found in examples/dqa.conf
```xml
LoadModule cgid_module modules/mod_cgid.so

<Directory /var/www/html/dqa>  
  Options Indexes FollowSymLinks MultiViews ExecCGI  
  AddHandler cgi-script .py  
  Require all granted  
</Directory>  
```


Only the html folder needs to be exposed via the web server.  
This is done by a soft link.  
sudo ln -s /data/www/dqa/html /var/www/html/dqa  

###### Database Setup
Create a file named db.config in the bin directory modeled after examples/sampledb.config
```bash
cp examples/db.config bin/db.config
# Change the file match correct authentication
vim bin/db.config
```
