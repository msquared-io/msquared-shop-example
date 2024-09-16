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
    console.log('User:', req.user.user_id, "buying", req.body.items.length, "item(s)")

    const userId = req.user.user_id;
    const itemId = req.body.itemId;
    const amount = req.body.amount;
    const itemPrice = shopJson.items[itemId];
    if(itemPrice === undefined) {
        return res.status(400).send('Invalid item ID');
    }
    if(!amount || amount < 1) {
        return res.status(400).send('Invalid amount');
    }

    let transfers = [];

    // add transfers for all items to be bought
    let purchaseCost = 0;
    for(const item of req.body.items) {
        const itemId = item.itemId;
        const amount = item.amount;
        const itemPrice = shopJson.items[itemId];
        if(itemPrice === undefined) {
            console.log('Invalid item ID', itemId)
            return res.status(400).send(`Invalid item ID ${itemId}`);
        }
        if(!amount || amount < 1) {
            console.log('Invalid amount', amount)
            return res.status(400).send('Invalid amount');
        }
        purchaseCost += itemPrice * amount;

        // if we're granting currency (the itemId is our currency, add it to the currency balance change)
        if(itemId === shopJson.currency) {
            purchaseCost += itemPrice * amount - amount;
        }
        else {
            let [datasourceId, objectDefinitionId] = itemId.split('.');

            transfers.push({
                userId: req.user.user_id,
                datasourceId,
                objectDefinitionId,
                change: amount
            });
        }
    }

    // add transfer for currency
    [currencyDataSourceId, currencyObjectDefinitionId] = shopJson.currency.split('.');
    transfers.push({
        userId: req.user.user_id,
        datasourceId: currencyDataSourceId,
        objectDefinitionId: currencyObjectDefinitionId,
        change: -1 * purchaseCost
    });

    try {
        const result = await postWebPlatform('api/datasources/transfer', transfers);
        console.log(transfers)
        if(result.status !== 200) {
            console.log('Error transferring items', await result.text());
            return res.status(500).send('Error transferring items');
        }
        res.json({ message: 'Buy successful' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing buy');
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
