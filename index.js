const express = require('express');
const delegatedAuth = require('./delegated-auth-middleware');
const fetch = require('node-fetch');
const shopJson = require('./shop.json');

const app = express();
app.use(express.json());

const baseUrl = "https://api.m2worlds.io"
const port = process.env.PORT || 3000;
const apiKey = process.env.API_KEY;
const organizationId = process.env.ORGANIZATION_ID;

async function postWebPlatform(path, data) {
    const url = `${baseUrl}/${path}`
    return fetch(url, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            "x-m2-organization-id": organizationId,
            "x-api-key": apiKey,
            "Content-Type": "application/json",
        }
    })
}

app.get('/shop', delegatedAuth(organizationId), async (req, res) => {
    console.log('User:', req.user.user_id, "asking for items")
    res.json(shopJson);
});

app.post('/buy', delegatedAuth(organizationId), async (req, res) => {
    console.log('User:', req.user.user_id, "attempting to buy", req.body.amount , "of", req.body.itemId)

    const userId = req.user.user_id;
    const itemId = req.body.itemId;
    const amount = req.body.amount;
    const itemPrice = shopJson.items[itemId];
    if(!itemPrice) {
        return res.status(400).send('Invalid item ID');
    }
    if(!amount || amount < 1) {
        return res.status(400).send('Invalid amount');
    }

    [currencyDataSourceId, currencyObjectDefinitionId] = shopJson.currency.split('.');
    [itemDataSourceId, itemObjectDefinitionId] = itemId.split('.');

    const transferRequest = [{
        userId,
        datasourceId: currencyDataSourceId,
        objectDefinitionId: currencyObjectDefinitionId,
        change: -itemPrice * amount
    },
    {
        userId,
        datasourceId: itemDataSourceId,
        objectDefinitionId: itemObjectDefinitionId,
        change: amount
    }];

    try {
        await postWebPlatform('api/datasources/transfer', transferRequest);
        res.json({ message: 'Buy successful' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing buy');
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});