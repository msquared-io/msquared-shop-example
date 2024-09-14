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

app.post('/purchase', delegatedAuth(organizationId), async (req, res) => {
    console.log('User:', req.user.user_id, "attempting to purchase item", req.body.itemId)

    const userId = req.user.user_id;
    const itemId = req.body.itemId;
    const itemPrice = shopJson.items[itemId];
    if(!itemPrice) {
        return res.status(400).send('Invalid item ID');
    }

    [currencyDataSourceId, currencyObjectDefinitionId] = shopJson.currency.split('.');
    [itemDataSourceId, itemObjectDefinitionId] = itemId.split('.');

    const transferRequest = [{
        userId,
        datasourceId: currencyDataSourceId,
        objectDefinitionId: currencyObjectDefinitionId,
        change: -itemPrice
    },
    {
        userId,
        datasourceId: itemDataSourceId,
        objectDefinitionId: itemObjectDefinitionId,
        change: 1
    }];

    try {
        await postWebPlatform('api/datasources/transfer', transferRequest);
        res.json({ message: 'Purchase successful' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing purchase');
    }
});

app.post('/grantCurrency' , delegatedAuth(organizationId), async (req, res) => {
    console.log('User:', req.user.user_id, "attempting to grant currency", req.body.amount)

    const userId = req.user.user_id;
    const { amount } = req.body;

    [datasourceId, objectDefinitionId] = shopJson.currency.split('.');

    const grantRequest = [{
        userId,
        datasourceId,
        objectDefinitionId,
        change: amount
    }];

    try {
        await postWebPlatform('api/datasources/transfer', grantRequest);
        res.json({ message: 'Currency granted' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error granting currency');
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});