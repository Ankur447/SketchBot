import { ReactSketchCanvas } from 'react-sketch-canvas';
import { createRef, useState } from 'react';
import serviceApi from './service/axios.js';

function App() {
	const refCanvas = createRef<any>();
	const [aggressiveMode, setAggresiveMode] = useState(true);
	const [paths, setPaths] = useState([]);
	const [eraserMode, setEraserMode] = useState(false);

	const sendPath = async (paths: any) => {
		console.log(paths);
		await serviceApi
			.post('/draw', paths)
			.then((response: any) => {
				console.log(response.data);
			})
			.catch((error: any) => {
				console.log(error.toJSON());
			});
	};

	const sendCommand = async (command: String) => {
		await serviceApi
			.post(`/command/${command}`)
			.then((response: any) => {
				console.log(response.data);
			})
			.catch((error: any) => {
				console.log(error.toJSON());
			});
	};

	// const onExportSVG = () => {
	// 	refCanvas.current.exportSvg().then((data: any) => {
	// 		console.log(data);
	// 	});
	// };

	const scribble = () => {
		refCanvas.current.eraseMode(false);
		setEraserMode(false);
	};

	const eraser = () => {
		refCanvas.current.eraseMode(true);
		setEraserMode(true);
	};

	const penLine = () => {
		refCanvas.current.eraseMode(false);
		setEraserMode(false);
	};

	const clearCanvas = () => {
		refCanvas.current.clearCanvas();
		sendCommand('home');
	};

	const sendHome = () => {
		sendCommand('home');
	};

	const sendReset = () => {
		sendCommand('reset');
	};

	const setworkheight = () => {
		sendCommand('setworkheight');
	};

	const testworkheight = () => {
		sendCommand('testworkheight');
	};

	const sendDrawing = () => {
		if (!aggressiveMode) {
			sendPath(paths);
		}
	};

	const openSettings = () => {};

	const onChange = (paths: never) => {
		setPaths([...paths]);
	};

	const onStroke = (stroke: any) => {
		if (!eraserMode) {
			if (aggressiveMode) {
				sendPath([stroke]);
			}
		}
	};

	return (
		<>
			<ul className="toolbar">
				<li onClick={scribble}>
					<i className="fa-regular fa-scribble"></i>
				</li>
				<li onClick={eraser}>
					<i className="fa-regular fa-eraser"></i>
				</li>

				<li onClick={penLine}>
					<i className="fa-regular fa-pen-line"></i>
				</li>

				<li onClick={clearCanvas}>
					<i className="fa-regular fa-rotate-right"></i>
				</li>

				<li onClick={sendDrawing}>
					<i className="fa-regular fa-share-from-square"></i>
				</li>

				<li onClick={openSettings}>
					<i className="fa-regular fa-gear"></i>
				</li>
			</ul>

			<div className="settings-tab">
				<button onClick={sendHome}>Home</button>
				<button onClick={sendReset}>Reset</button>
				<button onClick={setworkheight}>Set Touch Paper</button>
				<button onClick={testworkheight}>Test Touch Paper</button>
				<br></br>
				x <input type="number" name="x" value={0} />
				y <input type="number" name="y" value={0} />
				z <input type="number" name="z" value={0} />
			</div>

			<ReactSketchCanvas
				width="1024"
				strokeWidth={4}
				strokeColor="black"
				className="canvas"
				eraserWidth={10}
				onStroke={onStroke}
				onChange={onChange}
				ref={refCanvas}
			/>
		</>
	);
}

export default App;
