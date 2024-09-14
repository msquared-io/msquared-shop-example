# MSquared Shop Example

An example node.js service for buying items from a shop

## Environment Variables

`PORT` - The port the server will listen on (used by Cloud Run and other PaaS)

`API_KEY` - M2 Server API Key

`ORGANIZATION_ID` - M2 Organization ID

## Configuring the shop

Define the object used for currency, and a map
of items to prices

```
{
  "currency" : "EFTfrHydl8I3ynkWnsRV.DeburwrKabSxgVbSYz8c",
  "items" : {
    "EFTfrHydl8I3ynkWnsRV.gbOqXWTOYsUxV7zOxskh" : 100,
    "EFTfrHydl8I3ynkWnsRV.U48MEsRbxvbtj60Yp46n" : 200
  }
}
```

## Running Locally

Set the environment variables and run the following commands:

## Endpoints

`GET /shop` returns the JSON object of the shop - currency and items
`POST /buy` with a JSON object containing `itemId` and `amount` to purchase an item

```bash
npm install
npm start
```
