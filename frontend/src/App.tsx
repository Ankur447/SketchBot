import { ReactSketchCanvas } from 'react-sketch-canvas';
import { createRef, useState, useEffect } from 'react';
import Modal from 'react-modal';
import serviceApi from './service/axios.js';

Modal.setAppElement('#root');

function App() {
	const refCanvas = createRef<any>();
	const [aggressiveMode, setAggresiveMode] = useState(true);
	const [eraserMode, setEraserMode] = useState(false);
	const [paths, setPaths] = useState<
		Array<{ drawMode: Boolean; paths: any; strokeColor: String; strokeWidth: Number }>
	>([]);
	const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0, z: 0, e: 0 });
	const [modalIsOpen, setIsOpen] = useState(false);

	const customStyles = {
		content: {
			top: '46%',
			left: '50%',
			right: 'auto',
			bottom: 'auto',
			marginRight: '-50%',
			transform: 'translate(-50%, -50%)',
			boxShadow: '0px 0px 16px -4px rgba(0, 0, 0, 0.31)',
			border: 'None',
		},
	};

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

	const scribble = () => {
		refCanvas.current.eraseMode(false);
		setEraserMode(false);
	};

	const eraser = () => {
		if (aggressiveMode) {
			refCanvas.current.eraseMode(false);
			setEraserMode(false);
		} else {
			refCanvas.current.eraseMode(true);
			setEraserMode(true);
		}
	};

	const traceImage = () => {
		refCanvas.current.eraseMode(false);
		setEraserMode(false);
	};

	const clearCanvas = () => {
		refCanvas.current.clearCanvas();
		sendCommand('home');
		setPaths([]);
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

	const onChange = (paths: Array<{ drawMode: Boolean; paths: any; strokeColor: String; strokeWidth: Number }>) => {
		let new_paths: Array<{ drawMode: Boolean; paths: any; strokeColor: String; strokeWidth: Number }> = [];

		paths.map((path: any) => {
			if (path.drawMode) {
				new_paths = [...new_paths, path];
			}
		});
		setPaths([...new_paths]);
	};

	const onStroke = (stroke: any) => {
		if (!eraserMode) {
			if (aggressiveMode) {
				sendPath([stroke]);
			}
		}
	};

	function openModal() {
		setIsOpen(true);
	}

	function closeModal() {
		setIsOpen(false);
	}

	const mode = () => {
		setAggresiveMode(!aggressiveMode);
	};

	return (
		<div className="container">
			<ul className="toolbar">
				<li onClick={mode}>
					<i className={aggressiveMode ? 'fa-solid fa-toggle-on' : 'fa-solid fa-toggle-off'}></i>
				</li>
				<li onClick={scribble}>
					<i className="fa-regular fa-scribble"></i>
				</li>
				<li onClick={eraser} className={aggressiveMode ? 'disabled' : ''}>
					<i className="fa-regular fa-eraser"></i>
				</li>

				<li onClick={traceImage}>
					<i className="fa-regular fa-images"></i>
				</li>

				<li onClick={clearCanvas}>
					<i className="fa-regular fa-rotate-right"></i>
				</li>

				<li onClick={sendDrawing} className={aggressiveMode ? 'disabled' : ''}>
					<i className="fa-regular fa-share-from-square"></i>
				</li>

				<li onClick={openModal}>
					<i className="fa-regular fa-gear"></i>
				</li>
			</ul>

			<Modal
				isOpen={modalIsOpen}
				onRequestClose={closeModal}
				style={customStyles}
				// className="modal-settings"
			>
				<div className="modal-header">
					<h2>Settings</h2>

					<button onClick={closeModal} className="close-button">
						<i className="fa-solid fa-xmark"></i>
					</button>
				</div>

				<div className="settings-tab">
					<div className="form-container">
						<button onClick={sendHome} className="m-r">
							Home
						</button>
						<button onClick={sendReset}>Reset</button>
					</div>

					<div className="form-container m-t">
						<div className="form-group m-r">
							<label>X</label>
							<input type="number" name="x" value={currentPosition.x} onChange={onChangePosition} step={1} min={-70} />
						</div>

						<div className="form-group m-r">
							<label>Y</label>
							<input type="number" name="y" value={currentPosition.y} onChange={onChangePosition} step={1} min={-70} />
						</div>

						<div className="form-group">
							<label>Z</label>
							<input type="number" name="z" value={currentPosition.z} onChange={onChangePosition} step={1} min={-70} />
						</div>
					</div>
					<div className="form-container m-t">
						<button onClick={setworkheight} className="m-r">
							Set Touch Paper
						</button>
						<button onClick={testworkheight}>Test Touch Paper</button>
					</div>
				</div>
			</Modal>

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
		</div>
	);
}

export default App;
