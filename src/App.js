import logo from "./logo.svg";
import "./App.css";
import { useEffect, useState } from "react";

function App() {
	const [state, setState] = useState({
		data: {},
		allSymbols: [],
		justPrices: [],
	});

	let socket = new WebSocket("wss://production-esocket.delta.exchange");

	const apiCall = async () => {
		const res = await fetch("https://api.delta.exchange/v2/products");
		const data = await res.json();
		const dataOb = {};
		const allSymbols = [];
		data?.result?.slice(0, 30)?.forEach((item) => {
			const { symbol, description, underlying_asset } = item;
			dataOb[symbol] = { description, assetSymbol: underlying_asset.symbol };
			allSymbols.push(symbol);
		});
		setState((state) => ({ ...state, data: dataOb, allSymbols }));
	};

	useEffect(() => {
		apiCall();
		return () => {
			socket.close();
		};
	}, []);

	useEffect(() => {
		if (state.allSymbols.length !== 0) {
			socket.onopen = function (e) {
				const params = {
					type: "subscribe",
					payload: {
						channels: [
							{
								name: "v2/ticker",
								symbols: state.allSymbols,
							},
						],
					},
				};
				socket.send(JSON.stringify(params));
			};

			socket.onmessage = function (e) {
				const dt = JSON.parse(e.data);
				const price = dt.mark_price;
				if (dt) {
					setState((state) => ({ ...state, justPrices: { ...state.justPrices, [dt.symbol]: price } }));
				}
			};

			socket.onerror = function (err) {
				console.log(err.message);
			};
		}
	}, [state.allSymbols]);

	return (
		<section className="main">
			<h1 className="title">Delta Exchange</h1>
			{Object.keys(state.data)?.length !== 0 ? (
				<table>
					<thead>
						<tr>
							{["Symbol", "Description", "Underlying Asset", "Mark Price"].map((item) => {
								return <th key={item}>{item}</th>;
							})}
						</tr>
					</thead>
					<tbody>
						{Object.keys(state.data)?.map((key) => {
							const { symbol, description, assetSymbol } = state.data[key];
							const price = Number(state.justPrices[key]).toFixed(6) ?? "....";
							return (
								<tr key={key}>
									<td>{key}</td>
									<td>{description}</td>
									<td>{assetSymbol}</td>
									<td>{price}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			) : (
				<h4 className="loader-text">Fetching Data...</h4>
			)}
		</section>
	);
}

export default App;
