import paytmchecksum from '../paytm/PaytmChecksum.js';
import { paytmParams, paytmMerchantkey } from '../index.js';
import formidable from 'formidable';
import https from 'https';

// Add Payment Gateway
export const addPaymentGateway = async (request, response) => {
    try {
        // Generate checksum for the payment request
        const paytmCheckSum = await paytmchecksum.generateSignature(paytmParams, paytmMerchantkey);
        const params = {
            ...paytmParams,
            'CHECKSUMHASH': paytmCheckSum,
        };
        response.json(params);
    } catch (error) {
        console.error("Error in addPaymentGateway:", error);
        response.status(500).send("Failed to generate payment gateway params");
    }
};

// Payment Response
export const paymentResponse = (request, response) => {
    const form = new formidable.IncomingForm();

    form.parse(request, (err, fields) => {
        if (err) {
            console.error("Error parsing form:", err);
            response.status(400).send("Invalid form data");
            return;
        }

        const paytmCheckSum = fields.CHECKSUMHASH;
        delete fields.CHECKSUMHASH;

        // Verify the checksum
        const isVerifySignature = paytmchecksum.verifySignature(fields, paytmMerchantkey, paytmCheckSum);

        if (isVerifySignature) {
            console.log("Checksum verified successfully");
            handlePaytmResponse(fields, response);
        } else {
            console.error("Checksum Mismatched");
            response.status(400).send("Checksum Mismatched");
        }
    });
};

// Handle Paytm Response
const handlePaytmResponse = (fields, response) => {
    let paytmParams = {
        MID: fields.MID,
        ORDERID: fields.ORDERID,
    };

    // Generate checksum for order status request
    paytmchecksum.generateSignature(paytmParams, paytmMerchantkey).then((checksum) => {
        paytmParams["CHECKSUMHASH"] = checksum;

        const post_data = JSON.stringify(paytmParams);

        const options = {
            hostname: 'securegw-stage.paytm.in', // Use sandbox URL for testing
            port: 443,
            path: '/order/status',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': post_data.length,
            },
        };

        let res = "";
        const post_req = https.request(options, (post_res) => {
            post_res.on('data', (chunk) => {
                res += chunk;
            });

            post_res.on('end', () => {
                try {
                    const result = JSON.parse(res);
                    console.log("Paytm Response:", result);

                    // Check payment status from the response and redirect accordingly
                    if (result.STATUS === "TXN_SUCCESS") {
                        // Redirect to the success page
                        console.log("Payment successful for Order ID:", fields.ORDERID);
                        response.redirect(`http://localhost:3000/success?orderId=${fields.ORDERID}`); // Redirect to success page
                    } else {
                        console.error("Payment failed for Order ID:", fields.ORDERID);
                        response.redirect(`http://localhost:3000/failure?orderId=${fields.ORDERID}`); // Redirect to failure page
                    }

                } catch (error) {
                    console.error("Error parsing Paytm response:", error);
                    response.status(500).send("Error processing payment status");
                }
            });
        });

        post_req.on('error', (error) => {
            console.error("Error in HTTPS request:", error);
            response.status(500).send("Error contacting Paytm server");
        });

        post_req.write(post_data);
        post_req.end();
    }).catch((err) => {
        console.error("Error generating checksum for order status:", err);
        response.status(500).send("Error generating checksum for order status");
    });
};
