import { ethers } from "ethers";
import React, { useState, useEffect } from "react";

import "./App.css";
import { chainId, COMP_ADDRESS, USDC_ADDRESS } from "./constants";

import { Token, TradeType } from "@uniswap/sdk-core";
import { AlphaRouter, CurrencyAmount } from "@uniswap/smart-order-router";
import JSBI from "jsbi";

// Ethereum Network Configuration
const provider = new ethers.providers.InfuraProvider(
  "homestead",
  "acac0ae91ab44dbd82a5f1da8f9e48e8"
);

declare type QuoteDataType = {
  quote: string;
  path: Token[];
  protocol: string;
  percent: number;
};

const App = () => {
  const [amount, setAmount] = useState<string>("0");
  const [loader, setLoader] = useState<Boolean>(false);
  const [quoteAmount, setQuoteAmount] = useState<string>("");
  const [quote, setQuote] = useState<QuoteDataType[]>([]);

  const usdc = new Token(chainId, USDC_ADDRESS, 6, "USDC", "USD Coin");
  const comp = new Token(chainId, COMP_ADDRESS, 18, "COMP", "Compound");

  // const routerTrade = new UniswapTrade();
  const getAmountOut = async () => {
    setLoader(true);

    //converting amount in string to curreny
    const usdcAmount = ethers.utils.parseUnits(amount, usdc.decimals);

    const router = new AlphaRouter({ chainId, provider });

    const route = await router.route(
      CurrencyAmount.fromRawAmount(usdc, JSBI.BigInt(usdcAmount)),
      comp,
      TradeType.EXACT_INPUT
    );

    //array to maintain required data from route
    const route_data: QuoteDataType[] = [];
    route?.route.map((_quote) => {
      let required_data: QuoteDataType = {
        quote: "",
        path: [],
        protocol: "",
        percent: 0,
      };
      required_data.quote = ethers.utils.formatEther(_quote.rawQuote);
      required_data.path = _quote.tokenPath;
      required_data.protocol = _quote.protocol;
      required_data.percent = _quote.percent;
      route_data.push(required_data);
    });

    //to calculate the sum quote amount from the array
    let _quote_amount = route_data.reduce((a, b): any => {
      return parseFloat(a.quote) + parseFloat(b.quote);
    });
    setQuoteAmount(_quote_amount.quote);
    setQuote(route_data);
    setLoader(false);
  };

  useEffect(() => {
    setQuoteAmount("");
    setQuote([]);
  }, [amount]);

  return (
    <div className="App">
      <div className="quote-wrapper">
        <div className="input-wrapper">
          <div>{`USDC --> COMP (get quote)`} </div>
          <input
            className="token-input"
            type="number"
            placeholder="Enter USDC"
            onChange={(e) => setAmount(e.target.value ? e.target.value : "0")}
          />
        </div>
        <button
          className="getquote-button"
          onClick={() => getAmountOut()}
          disabled={amount === "0" || !amount}
        >
          Get Quote
        </button>
        <div className="quote-display-wrapper">
          {loader ? (
            "Loading..."
          ) : quote.length > 0 ? (
            <div className="quote-display">
              <div className="quote-amount-wrapper">
                <div className="quote-amount">
                  {quoteAmount.substring(0, 6)}{" "}
                </div>
                - COMP
              </div>
              <div className="quote-path-display">
                <span>Optimal Path:</span>
                <div className="path-wrapper">
                  {quote.map((quote_item) => {
                    return (
                      <div className="path-item-wrapper">
                        <div className="path-protocol path-box">
                          {quote_item.protocol}
                        </div>
                        <div className="path-percent path-box">
                          {quote_item.percent} %
                        </div>
                        {quote_item.path.map((token) => {
                          return (
                            <div className="path-token path-box">
                              {token.symbol}
                            </div>
                          );
                        })}

                        <div className="path-hr-line" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
