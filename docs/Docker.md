# Docker Deployment and Debugging

These instructions will show you how to push Containers running in VSCode to the Heroku container repository.

## Manually

1. Press F1 to see commands list
   1. Docker: Compose Up
   2. Choose the root docker-compose.yml file
2. Open Terminal
    1. heroku login
    2. docker ps
    3. heroku container:login
    4. heroku container:push web -a lct-c (this will take a while because it's building for prod)
    5. heroku container:release web -a lct-c

## Automatically

It's easier and faster to push the lct-c master branch to heroku. This will ensure the code base, itself, is the same for dev and prod.

From the Terminal:
>$ git push heroku master:master

see https://devcenter.heroku.com/articles/duplicate-build-version

This will:

* fetch the code to Heroku, and
* Build the Container with
  * /Dockerfile

Or you could use this link:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

Now you can see the changes on

<https://lct.c2.herokuapp.com>
