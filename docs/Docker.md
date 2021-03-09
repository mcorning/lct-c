# Docker Deployment and Debugging

After running Docker: Compose-up you will see two containers running under the Docker extention.

Go to a Terminal and enter:

1. heroku login
2. docker ps
3. heroku container:login
4. heroku container:push web -a lct-c (this will take a while because it's building for prod)
5. heroku container:release web -a lct-c

if you see this error in the build log:
=== Fetching app code
=!= Your app does not include a heroku.yml build manifest. To deploy your app, either create a heroku.yml: https://devcenter.heroku.com/articles/build-docker-images-heroku-yml
Or change your stack by running: 'heroku stack:set heroku-20'


