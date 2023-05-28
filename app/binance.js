import * as cryptojs from "crypto-js";
const fs = require('fs')

const runRequest = async(method, path, apiKey, secretKey, params) => {
    if (params.length > 0) params += '&';
    params += `timestamp=${(new Date()).valueOf()}`
    const signature = cryptojs.HmacSHA256(params, secretKey)
    params += `&signature=${signature.toString(cryptojs.enc.Hex)}`;
    const response = await fetch('https://api.binance.com' + path + "?" + params,
        {
            headers: {
                "X-MBX-APIKEY": apiKey
            },
            method: method,
        })
    if (!response.ok) {
        throw new Error("Response is an error")
    }
    return await response.json()
}

export const getFees = async (apiKey, secretKey) => {
    const path = '/sapi/v1/capital/config/getall'
    const params = "recvWindow=30000"

    const response = await runRequest("GET", path, apiKey, secretKey, params)

    // Filtering and unifying
    const interestingCoins = [
        "ATOM",
        "AVAX",
        "BNB", 
        "BUSD",
        "DAI",
        "ETH",
        "FTM",
        "DOT",
        "MATIC",
        "SOL",
        "USDT",
        "USDC",
        "ONE",
    ]

    const extractFees = (coinInfo, networks) => {
        return coinInfo.networkList.filter(n => {
            return networks.indexOf(n.network) > -1 && n.withdrawEnable
        }).map(
            n => [`${coinInfo.coin}-${n.network}`, n.withdrawFee]
        )
    }
    fs.writeFileSync('./binance.dump.js', JSON.stringify(response, undefined, 4))
    return response.filter(
        coin => interestingCoins.indexOf(coin['coin']) > -1
    ).map(
        coinInfo => {
            // For some networks Binance provides some BNB-wrappers, which I don't think are interesting now
            if (coinInfo.coin === "BNB") return extractFees(coinInfo, ["BSC"])
            if (coinInfo.coin === "DOT") return extractFees(coinInfo, ["DOT"])
            if (coinInfo.coin === "ATOM") return extractFees(coinInfo, ["ATOM"])
            if (coinInfo.coin === "SOL") return extractFees(coinInfo, ["SOL"])
            if (coinInfo.coin === "AVAX") return extractFees(coinInfo, ["AVAX"])
            if (coinInfo.coin === "MATIC") return extractFees(coinInfo, ["MATIC"])
            if (coinInfo.coin === "FTM") return extractFees(coinInfo, ["FTM"])
            if (coinInfo.coin === "ONE") return extractFees(coinInfo, ["ONE"])

            return coinInfo.networkList.filter(n => {
                return n.withdrawEnable
            }).map(
                n => [`${coinInfo.coin}-${n.network}`, n.withdrawFee]
            )
        }
    ).reduce(
        (prevNetworks, curNetworks) => prevNetworks.concat(curNetworks),
        []
    )
}