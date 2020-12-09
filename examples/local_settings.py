
# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

SECRET_KEY = 'uwh)=eqffff)f%u%pf^0z)h=7s&cf1_r$bsn!vyz4bmxzo0)77'

ALLOWED_HOSTS = ['vmdb001',
                 'vmdb001.gs.doi.net',
                 'igskgacgvmdb001.gs.doi.net',
                 'vmweb01'
                 ]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': 'dqa_prod',
        'USER': 'dqa_read',
        'PASSWORD': 'password',
        'HOST': 'vmdb001',
        'PORT': '5432',
    },
}

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.11/howto/static-files/

STATIC_URL = '/static/dqa/'

# Comment out if running using manage.py runserver
STATIC_ROOT = '/var/www/html/static/dqa/'

# Exclude the following groups from the default DQA
EXCLUDE_FROM_DEFAULT_GROUPS = []
