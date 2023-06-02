import axios from 'axios';

/*******************************/
/* Default Axios configuration */
/*******************************/
let serviceApi = axios.create({
	baseURL: 'http://oneplusarm.local:5000',
	headers: {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Credentials': true,
		'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
	},
	params: {},
});

/*******************************/
/* Default Axios Error Catching 
reserved for future */
/*******************************/
// serviceApi.interceptors.response.use(
// 	(response) => response,
// 	(error) => {
// 		// console.log(error);
// 		throw error;
// 	}
// );

export default serviceApi;
