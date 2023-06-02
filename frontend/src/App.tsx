import { ReactSketchCanvas } from 'react-sketch-canvas';
import { createRef, useState, useEffect } from 'react';
import serviceApi from './service/axios.js';

function App() {
	const refCanvas = createRef<any>();
	const [aggressiveMode, setAggresiveMode] = useState(true);
	const [eraserMode, setEraserMode] = useState(false);
	const [paths, setPaths] = useState([]);
	const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0, z: 0, e: 0 });

	const getPosition = async () => {
		await serviceApi
			.get('/position')
			.then((response: any) => {
				setCurrentPosition({ ...response.data });
				console.log(response);
			})
			.catch((error: any) => {
				console.log(error.toJSON());
			});
	};

	const sendPosition = async (currentPosition: any) => {
		await serviceApi
			.post('/move', currentPosition)
			.then((response: any) => {
				// setCurrentPosition({ ...response.data });
				// console.log(response);
			})
			.catch((error: any) => {
				console.log(error.toJSON());
			});
	};

	const onChangePosition = (event: any) => {
		const position = { ...currentPosition, [event.target.name]: parseInt(event.target.value) };
		sendPosition(position);
		console.log(currentPosition);
		setCurrentPosition({ ...position });
	};

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
				getPosition();
			})
			.catch((error: any) => {
				console.log(error.toJSON());
			});
	};

	useEffect(() => {
		getPosition();
	}, []);

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
				x <input type="number" name="x" value={currentPosition.x} onChange={onChangePosition} step={1} />
				y <input type="number" name="y" value={currentPosition.y} onChange={onChangePosition} step={1} />
				z <input type="number" name="z" value={currentPosition.z} onChange={onChangePosition} step={1} />
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
