### Stayhalo Retail 

The following env variables need to be defined
- mongoURL => URL to connect to MongoDB
- mongoDBName => Database name for MongoDB for storing data.
- redisHost => Host name to help redis client connect.
- redisPort => Port in which redis is serving.
- telegramToken => Required telegram bot token to which it provides the retail feature.
- telegramWebhook => Webhook url to which telegram will callback on each from the bot.
- telegramURL => Url of telegram apis.
- becknService => Url to hosted beckn BAP Adaptor.


##### Requirements to run the server

- Docker
- Docker Compose
- Running instance of bap adaptor

    ```
    https://github.com/techframewirk/bap-adaptor
    ```

##### Steps to Run the server

```
docker-compose up -d
```
