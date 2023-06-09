import { ReactSketchCanvas } from 'react-sketch-canvas';
import { createRef, useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from 'react-modal';
import axios from 'axios';

const api = axios.create({
	baseURL: 'http://oneplusarm.local:5000',
	headers: {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Credentials': true,
		'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
	},
	params: {},
});

Modal.setAppElement('#root');

function App() {
	const refCanvas = createRef<any>();
	const [aggressiveMode, setAggresiveMode] = useState(true);
	// const [aggressiveMode] = useState(true);
	const [eraserMode, setEraserMode] = useState(false);
	const [paths, setPaths] = useState<
		Array<{ drawMode: Boolean; paths: any; strokeColor: String; strokeWidth: Number }>
	>([]);
	const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0, z: 0, e: 0 });
	const [modalIsOpen, setIsOpen] = useState(false);
	const [confirmIsOpen, setConfirmIsOpen] = useState(false);
	const [backgroundImage, setBackgroundImage] = useState();

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

	const customStyles_confirm = {
		content: {
			top: '46%',
			left: '50%',
			right: 'auto',
			bottom: 'auto',
			marginRight: '-50%',
			transform: 'translate(-50%, -50%)',
			boxShadow: '0px 0px 16px -4px rgba(0, 0, 0, 0.31)',
			border: 'None',
			maxWidth: '400px',
		},
	};

	// const scribble = () => {
	// 	refCanvas.current.eraseMode(false);
	// 	setEraserMode(false);
	// };

	// const eraser = () => {
	// 	if (aggressiveMode) {
	// 		refCanvas.current.eraseMode(false);
	// 		setEraserMode(false);
	// 	} else {
	// 		refCanvas.current.eraseMode(true);
	// 		setEraserMode(true);
	// 	}
	// };

	const traceImage = () => {
		refCanvas.current.eraseMode(false);
		setEraserMode(false);
	};

	const clearCanvas = () => {
		refCanvas.current.resetCanvas();
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

	const getPosition = async () => {
		await api
			.get('/position')
			.then((response: any) => {
				if (response.data.type == 'success') {
					setCurrentPosition({ ...response.data.message });
					showToast(
						'info',
						`Current Position X ${response.data.message.x} Y ${response.data.message.y} Z ${response.data.message.z}`
					);
				} else {
					showToast('info', response.data.message);
				}

				console.log(response);
			})
			.catch((error: any) => {
				showToast('error', error.toJSON().message);
			});
	};

	const sendPosition = async (currentPosition: any) => {
		await api
			.post('/move', currentPosition)
			.then((response: any) => {
				// setCurrentPosition({ ...response.data });
				console.log(response);
			})
			.catch((error: any) => {
				showToast('error', error.toJSON().message);
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
		await api
			.post('/draw', paths)
			.then((response: any) => {
				console.log(response.data);
			})
			.catch((error: any) => {
				showToast('error', error.toJSON().message);
			});
	};

	const sendCommand = async (command: String) => {
		await api
			.post(`/command/${command}`)
			.then((response: any) => {
				showToast(response.data.type, response.data.message);
				getPosition();
			})
			.catch((error: any) => {
				showToast('error', error.toJSON().message);
			});
	};

	const getImageFile = () => {
		const callImage = async () => {
			await api
				.get('/get_image')
				.then((response: any) => {
					if (response.data.type == 'success') {
						showToast('success', response.data.message);
						setBackgroundImage(response.data.message);
					} else {
						showToast(response.data.type, response.data.message);
						setBackgroundImage(undefined);
					}
					console.log(response);
				})
				.catch((error: any) => {
					showToast('error', error.toJSON().message);
				});
		};

		if (refCanvas.current) {
			clearCanvas();
		}
		callImage();
	};

	const saveDrawing = () => {
		if (backgroundImage) {
			refCanvas.current.exportSvg().then((svgfile: any) => {
				setConfirmIsOpen(false);
				api
					.post(`/save_image`, { filename: backgroundImage, svg: svgfile })
					.then((response: any) => {
						if (response.data.type == 'success') {
							showToast('success', response.data.message);
							getImageFile();
							console.log(refCanvas);
						} else {
							showToast(response.data.type, response.data.message);
							setBackgroundImage(undefined);
						}
					})
					.catch((error: any) => {
						showToast('error', error.toJSON().message);
					});

				console.log(svgfile);
			});
		}
	};

	useEffect(() => {
		getImageFile();
	}, [backgroundImage]);

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

	function showToast(type: string, message: string) {
		switch (type) {
			case 'success':
				toast.success(message, {
					icon: () => <i className="fa-regular fa-circle-check"></i>,
				});
				return;

			case 'error':
				toast.error(message, {
					icon: () => <i className="fa-regular fa-circle-exclamation"></i>,
				});
				return;

			default:
				toast.info(message, {
					icon: () => <i className="fa-regular fa-circle-info"></i>,
				});
				return;
		}
	}

	function undoPath() {
		refCanvas.current.undo();
	}

	function redoPath() {
		refCanvas.current.redo();
	}

	function openConfirmModal() {
		setConfirmIsOpen(true);
	}

	function openModal() {
		setIsOpen(true);
	}

	function closeModal() {
		setIsOpen(false);
		setConfirmIsOpen(false);
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
				{/* <li onClick={scribble}>
					<i className="fa-regular fa-scribble"></i>
				</li> */}
				{/* <li onClick={eraser} className={aggressiveMode ? 'disabled' : ''}>
					<i className="fa-regular fa-eraser"></i>
				</li> */}

				<li onClick={clearCanvas} title="Clear Canvas">
					<i className="fa-regular fa-arrows-rotate"></i>
				</li>

				<li onClick={traceImage} title="Draw Mode">
					<i className="fa-regular fa-scribble"></i>
				</li>

				<li onClick={undoPath} title="Undo">
					<i className="fa-regular fa-rotate-left"></i>
				</li>

				<li onClick={redoPath} title="Redo">
					<i className="fa-regular fa-rotate-right"></i>
				</li>

				<li onClick={sendDrawing} className={aggressiveMode ? 'disabled' : ''} title="Send to Robot">
					<i className="fa-regular fa-share-from-square"></i>
				</li>

				<li
					onClick={backgroundImage && openConfirmModal}
					className={!backgroundImage ? 'disabled' : ''}
					title="Save SVG"
				>
					<i className="fa-regular fa-floppy-disk"></i>
				</li>

				<li onClick={openModal} title="Settings">
					<i className="fa-regular fa-gear"></i>
				</li>
			</ul>

			<Modal isOpen={modalIsOpen} onRequestClose={closeModal} style={customStyles}>
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

			<Modal isOpen={confirmIsOpen} onRequestClose={closeModal} style={customStyles_confirm}>
				<div className="modal-header">
					<h2>Confirm Save</h2>

					<button onClick={closeModal} className="close-button">
						<i className="fa-solid fa-xmark"></i>
					</button>
				</div>

				<div className="settings-tab">
					<p>
						Save this image only once the OnePlus Robot has finished drawing this piece. <br></br>
						<br></br>Once this image is saved you will not be able to draw this piece anymore.
					</p>
					<div className="form-container m-t">
						<button onClick={saveDrawing} className="m-r">
							Save
						</button>
						<button onClick={closeModal}>Cancel</button>
					</div>
				</div>
			</Modal>

			<ReactSketchCanvas
				width="1024px"
				height="661px"
				strokeWidth={4}
				strokeColor="black"
				className="canvas"
				eraserWidth={10}
				backgroundImage={
					backgroundImage
						? '/slices/' + backgroundImage
						: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Graph_paper_scan_1600x1000_%286509259561%29.jpg'
				}
				preserveBackgroundImageAspectRatio="preserveAspectRatio"
				onStroke={onStroke}
				onChange={onChange}
				ref={refCanvas}
			/>
			{backgroundImage ? backgroundImage : null}

			<ToastContainer
				position="bottom-right"
				autoClose={2000}
				hideProgressBar
				newestOnTop={false}
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable={false}
				pauseOnHover
				theme="light"
			/>
		</div>
	);
}

export default App;
