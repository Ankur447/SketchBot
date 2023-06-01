import { ReactSketchCanvas } from 'react-sketch-canvas';
import { createRef } from 'react';
import serviceApi from './service/axios.js';

function App() {
	const refCanvas = createRef<any>();

	const onLastStroke = async (stroke: any) => {
		await serviceApi
			.post('/draw', [stroke])
			.then((response: any) => {
				console.log(response.data);
			})
			.catch((error: any) => {
				console.log(error.toJSON());
			});
		console.log();
	};

	const onClearCanvas = async () => {
		refCanvas.current.clearCanvas();
		await serviceApi
			.post('/command/home')
			.then((response: any) => {
				console.log(response.data);
			})
			.catch((error: any) => {
				console.log(error.toJSON());
			});
	};

	// const onResetCanvas = () => {};

	const onExportSVG = () => {
		refCanvas.current.exportSvg().then((data: any) => {
			console.log(data);
		});
	};

	return (
		<>
			<ReactSketchCanvas
				width="1024"
				strokeWidth={4}
				strokeColor="black"
				className="canvas"
				onStroke={onLastStroke}
				ref={refCanvas}
			/>

			<button onClick={onClearCanvas}>Clear Canvas</button>
			<button onClick={onExportSVG}>Reset Work Height</button>
			<button onClick={onExportSVG}>Set Work Height</button>
		</>
	);
}

export default App;
