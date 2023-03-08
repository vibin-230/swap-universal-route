import { BigNumber, ethers } from "ethers";
import React, { useState, useEffect } from "react";

import "./App.css";
import { chainId, COMP_ADDRESS, USDC_ADDRESS } from "./constants";

import { Token, TradeType } from "@uniswap/sdk-core";
import { AlphaRouter, CurrencyAmount } from "@uniswap/smart-order-router";
import { FeeAmount } from '@uniswap/v3-sdk'
import bn from 'bignumber.js'
import JSBI from "jsbi";
import { defaultAbiCoder } from "ethers/lib/utils";

// import { CommandType, RoutePlanner } from "@uniswap/universal-router-sdk/dist/utils/routerCommands";
export enum CommandType {
  V3_SWAP_EXACT_IN = 0x00,
  V3_SWAP_EXACT_OUT = 0x01,
  PERMIT2_TRANSFER_FROM = 0x02,
  PERMIT2_PERMIT_BATCH = 0x03,
  SWEEP = 0x04,
  TRANSFER = 0x05,
  PAY_PORTION = 0x06,

  V2_SWAP_EXACT_IN = 0x08,
  V2_SWAP_EXACT_OUT = 0x09,
  PERMIT = 0x0a,
  WRAP_ETH = 0x0b,
  UNWRAP_WETH = 0x0c,
  PERMIT2_TRANSFER_FROM_BATCH = 0x0d,

  // NFT-related command types
  SEAPORT = 0x10,
  LOOKS_RARE_721 = 0x11,
  NFTX = 0x12,
  CRYPTOPUNKS = 0x13,
  LOOKS_RARE_1155 = 0x14,
  OWNER_CHECK_721 = 0x15,
  OWNER_CHECK_1155 = 0x16,

  X2Y2_721 = 0x18,
  SUDOSWAP = 0x19,
  NFT20 = 0x1a,
  X2Y2_1155 = 0x1b,
  FOUNDATION = 0x1c,
}

const PERMIT_STRUCT =
  '((address token,uint160 amount,uint48 expiration,uint48 nonce) details, address spender, uint256 sigDeadline)'

const PERMIT_BATCH_STRUCT =
  '((address token,uint160 amount,uint48 expiration,uint48 nonce)[] details, address spender, uint256 sigDeadline)'

const ALLOW_REVERT_FLAG = 0x80
const REVERTABLE_COMMANDS = new Set<CommandType>([
  CommandType.SEAPORT,
  CommandType.NFTX,
  CommandType.LOOKS_RARE_721,
  CommandType.LOOKS_RARE_1155,
  CommandType.X2Y2_721,
  CommandType.X2Y2_1155,
  CommandType.FOUNDATION,
  CommandType.SUDOSWAP,
  CommandType.NFT20,
  CommandType.CRYPTOPUNKS,
])

const ABI_DEFINITION: { [key in CommandType]: string[] } = {
  [CommandType.PERMIT]: [PERMIT_STRUCT, 'bytes'],
  [CommandType.PERMIT2_PERMIT_BATCH]: [PERMIT_BATCH_STRUCT, 'bytes'],
  [CommandType.PERMIT2_TRANSFER_FROM]: ['address', 'address', 'uint160'],
  [CommandType.PERMIT2_TRANSFER_FROM_BATCH]: ['bytes'],
  [CommandType.TRANSFER]: ['address', 'address', 'uint256'],
  [CommandType.V3_SWAP_EXACT_IN]: ['address', 'uint256', 'uint256', 'bytes', 'bool'],
  [CommandType.V3_SWAP_EXACT_OUT]: ['address', 'uint256', 'uint256', 'bytes', 'bool'],
  [CommandType.V2_SWAP_EXACT_IN]: ['address', 'uint256', 'uint256', 'address[]', 'bool'],
  [CommandType.V2_SWAP_EXACT_OUT]: ['address', 'uint256', 'uint256', 'address[]', 'bool'],
  [CommandType.SEAPORT]: ['uint256', 'bytes'],
  [CommandType.WRAP_ETH]: ['address', 'uint256'],
  [CommandType.UNWRAP_WETH]: ['address', 'uint256'],
  [CommandType.SWEEP]: ['address', 'address', 'uint256'],
  [CommandType.NFTX]: ['uint256', 'bytes'],
  [CommandType.LOOKS_RARE_721]: ['uint256', 'bytes', 'address', 'address', 'uint256'],
  [CommandType.LOOKS_RARE_1155]: ['uint256', 'bytes', 'address', 'address', 'uint256', 'uint256'],
  [CommandType.X2Y2_721]: ['uint256', 'bytes', 'address', 'address', 'uint256'],
  [CommandType.X2Y2_1155]: ['uint256', 'bytes', 'address', 'address', 'uint256', 'uint256'],
  [CommandType.FOUNDATION]: ['uint256', 'bytes', 'address', 'address', 'uint256'],
  [CommandType.PAY_PORTION]: ['address', 'address', 'uint256'],
  [CommandType.SUDOSWAP]: ['uint256', 'bytes'],
  [CommandType.OWNER_CHECK_721]: ['address', 'address', 'uint256'],
  [CommandType.OWNER_CHECK_1155]: ['address', 'address', 'uint256', 'uint256'],
  [CommandType.NFT20]: ['uint256', 'bytes'],
  [CommandType.CRYPTOPUNKS]: ['uint256', 'address', 'uint256'],
}

export class RoutePlanner {
  commands: string
  inputs: string[]

  constructor() {
    this.commands = '0x'
    this.inputs = []
  }

  addCommand(type: CommandType, parameters: any[], allowRevert = false): void {
    let command = createCommand(type, parameters)
    this.inputs.push(command.encodedInput)
    if (allowRevert) {
      if (!REVERTABLE_COMMANDS.has(command.type)) {
        throw new Error(`command type: ${command.type} cannot be allowed to revert`)
      }
      command.type = command.type | ALLOW_REVERT_FLAG
    }

    this.commands = this.commands.concat(command.type.toString(16).padStart(2, '0'))
  }
}
export type RouterCommand = {
  type: CommandType
  encodedInput: string
} 

export function createCommand(type: CommandType, parameters: any[]): RouterCommand {
  const encodedInput = defaultAbiCoder.encode(ABI_DEFINITION[type], parameters)
  return { type, encodedInput }
}
// Ethereum Network Configuration
const provider = new ethers.providers.InfuraProvider(
  "homestead",
  "acac0ae91ab44dbd82a5f1da8f9e48e8"
);

const smapleAddress ="0x0000000000000000000000000000000000000001"

declare type QuoteDataType = {
  quote: string;
  path: Token[];
  protocol: string;
  percent: number;
};



export function expandTo18DecimalsBN(n: number): BigNumber {
  // use bn intermediately to allow decimals in intermediate calculations
  return BigNumber.from(new bn(n).times(new bn(10).pow(18)).toFixed())
}

export function expandTo6DecimalsBN(n: number): BigNumber {
  // use bn intermediately to allow decimals in intermediate calculations
  return BigNumber.from(new bn(n).times(new bn(10).pow(6)).toFixed())
}

const FEE_SIZE = 3

export function encodePath(path: string[], fees: FeeAmount[]): string {
  if (path.length != fees.length + 1) {
    throw new Error('path/fee lengths do not match')
  }

  let encoded = '0x'
  for (let i = 0; i < fees.length; i++) {
    // 20 byte encoding of the address
    encoded += path[i].slice(2)
    // 3 byte encoding of the fee
    encoded += fees[i].toString(16).padStart(2 * FEE_SIZE, '0')
  }
  // encode the final token
  encoded += path[path.length - 1].slice(2)

  return encoded.toLowerCase()
}

function encodePathExactInput(tokens: string[]) {
  return encodePath(tokens, new Array(tokens.length - 1).fill(FeeAmount.MEDIUM))
}

const App = () => {
  const [amount, setAmount] = useState<string>("0");
  const [loader, setLoader] = useState<Boolean>(false);
  const [quoteAmount, setQuoteAmount] = useState<number>(0);
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
    const routePlanner = new RoutePlanner();
    let value
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
      const _path = _quote.tokenPath.map(path=>path.address)
      if(_quote.protocol === "V2"){
        value =routePlanner.addCommand(CommandType.V2_SWAP_EXACT_IN,[smapleAddress, expandTo6DecimalsBN(200),expandTo18DecimalsBN(0.003),_path,smapleAddress])
      } else if (_quote.protocol === "V3") {
        const path = encodePathExactInput(_path)
        value =routePlanner.addCommand(CommandType.V3_SWAP_EXACT_IN,[smapleAddress, expandTo6DecimalsBN(200),expandTo18DecimalsBN(0.003),path,smapleAddress])
      }
    });
    console.log("routeplaner",value,routePlanner)
  
    //to calculate the sum quote amount from the array
    let _quote_amount = route_data.reduce((a, b): any => {
      return a + parseFloat(b.quote);
    }, 0);

    setQuoteAmount(_quote_amount);
    setQuote(route_data);
    setLoader(false);
  };

  useEffect(() => {
    setQuoteAmount(0);
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
                <div className="quote-amount">{quoteAmount.toFixed(6)} </div>-
                COMP
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
                        <div className="path-box">
                          {quote_item.quote.substring(0, 6)}
                        </div>

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
