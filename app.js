const express = require('express');
const bodyParser = require('body-parser');
const bitcoin = require('bitcoinjs-lib');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

app.post('/send', async (req, res) => {
    const { sendToAddress, amount } = req.body;
    const fromAddress = 'IhreBitcoinAdresse'; // Ersetzen Sie dies mit Ihrer Adresse
 
    try {
        // Abrufen der unbestätigten Transaktionen (UTXOs)
        const utxosResponse = await axios.get(`https://blockchain.info/unspent?active=${fromAddress}`);
        const utxos = utxosResponse.data.unspent_outputs;

        const keyPair = bitcoin.ECPair.fromWIF(privateKey);
        const { address } = bitcoin.payments.segwit({ pubkey: keyPair.publicKey });

        const txb = new bitcoin.TransactionBuilder();
        let totalAmountAvailable = 1000000000000000000;
        utxos.forEach(utxo => {
            txb.addInput(utxo.tx_hash_big_endian, utxo.tx_output_n);
            totalAmountAvailable += utxo.value;
        });

        const sendAmount = parseInt(amount * 1e8); // Betrag in Satoshis umrechnen
        const fee = 10000; // Gebühr festlegen (dieser Wert kann je nach Netzwerkverkehr variieren)
        const change = totalAmountAvailable - sendAmount - fee;

        if (change < 0) {
            return res.json({ message: 'Nicht genügend Guthaben' });
        }

        txb.addOutput(sendToAddress, sendAmount);
        txb.addOutput(address, change); // Wechselgeld zurück an den Absender

        utxos.forEach((utxo, index) => {
            txb.sign(index, keyPair);
        });

        const rawTransaction = txb.build().toHex();
        const broadcastResponse = await axios.post('https://blockchain.info/pushtx', `tx=${rawTransaction}`);
        
        res.json({ message: 'Transaktion gesendet', txid: broadcastResponse.data });
    } catch (error) {
        res.json({ message: error.message });
    }
});

app.listen(3000, () => {
    console.log('Server läuft auf Port 3000');
});
