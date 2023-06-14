import { useEffect, useState } from 'react';

type NumberInputProps = {
	label: string;
	onChangeCallback: any;
	value: number;
};

const NumberInput = ({ label, onChangeCallback, value }: NumberInputProps) => {
	const [number, setNumber] = useState(value ? value : 0);

	const handleChange = (e: any) => {
		setNumber(parseInt(e.target.value));
		onChangeCallback({ name: e.target.name, value: e.target.value });
		console.log(e.target.value);
	};

	const countUp = () => {
		setNumber(number + 1);
	};

	const countDown = () => {
		setNumber(number - 1);
	};

	useEffect(() => {
		onChangeCallback({ name: label, value: number });
	}, [number]);

	return (
		<div className="form-group">
			<label>{label}</label>

			<div className="number-wrapper">
				<button className="step-button" onClick={countDown}>
					-
				</button>
				<input type="number" name={label} value={number} onChange={handleChange} />
				<button className="step-button" onClick={countUp}>
					+
				</button>
			</div>
		</div>
	);
};

export default NumberInput;
