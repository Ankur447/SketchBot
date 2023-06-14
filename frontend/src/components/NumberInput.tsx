import { useState, useEffect } from 'react';

type NumberInputProps = {
	label: string;
	onChange: any;
	value: number;
};

const NumberInput = ({ label, onChange, value }: NumberInputProps) => {
	const [number, setNumber] = useState(value ? value : 0);

	const countUp = () => {
		setNumber(number + 1);
	};

	const countDown = () => {
		setNumber(number - 1);
	};

	return (
		<div className="form-group">
			<label>{label}</label>

			<div className="number-wrapper">
				<button className="step-button" onClick={countDown}>
					-
				</button>
				<input type="number" name={label} value={number} onChange={onChange} step={1} min={-70} />
				<button className="step-button" onClick={countUp}>
					+
				</button>
			</div>
		</div>
	);
};

export default NumberInput;
