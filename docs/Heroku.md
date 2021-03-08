# Managing LCT-C on Heroku

This guide is for getting LCT-C Vue app to run under Heroku.

> For the app to work, LCT-C must be able to reach the LCT-C-Server. We cover these details under separate cover.

See Vue Deploy tutorial for other details and explanations: <https://medium.com/binarcode/deploying-vue-apps-to-heroku-the-right-way-26b11c1ae5cd>

## In development

Fork mcorning/lct-c repo

> Do not store keys or sensitive data in your LCT config files (see below)

Make changes to unsensitive config data
Make code changes as necessary for your community or organization

### Test First

Before deploying to Heroku, simultate how the client and server apps will work from there:

1. Start the lct-c-server locally
   1. From the `start-server` under the `server\package.json` NPM Explorer node
   2. Or from the Terminal:
      1. cd /server
      2. `node index.js`
2. Start the LCT-C Vue app:
   1. Using the `start` script under the `package.json` NPM Explorer node
   2. Or from the terminal
      1. cd to project root folder (where the package.json sits)
      2. enter `node ./srv/server.js`

> Note we use `index.js` for the main module under the `server` folder, and we use `server.js` for the main node in the `srv` folder to run the Vue app as a nodejs app.

If the app starts and can see the socket.io server, only then will you push changes to master (or main)

## On Heroku

1. Sign up for Heroku.com
2. Create a new app (lct-c)

### Settings

1. create config settings for app

   * MAP_API_KEY = [the key generated for your google cloud project]
   * REDIS_HOST= [url to redis server that includes redisgraph module]
   * REDIS_PWD= [your redis password]

### Deploy

1. Connect app to your github repo
2. Enable Automatic Deploys
3. Deploy Branch (if necessary)
4. Build can take several minutes...
5. You will see the following checks if all goes well:
   1. Recieve code from Github
   2. Build master
   3. Release phase
   4. Deploy to Heroku

>Your app was successfully deployed

You may still see a runtime error. See Issues below.

You can start the app with `Open app` button (top right corner)

## Issues

If your build fails, the `Deploy` page (or the build log details page) will help you figure out the problem.

> Pay attention to the config file challenge noted above.

If your app fails to start, you can view the heroku log files from the VS Code Terminal with:

```node
heroku logs --tail -a lct-c
```

## Support

Contact LCT-C lead dev mailto:mcorning@soteriaInstitute.org  for help. or appeal to the LCT-C Dev Community.
