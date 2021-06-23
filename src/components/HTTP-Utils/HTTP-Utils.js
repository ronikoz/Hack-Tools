import React, { useState } from 'react';
import {
	Button,
	Typography,
	Row,
	Col,
	Input,
	Select,
	Divider,
	Tag,
	message,
	Descriptions,
	Modal,
	Tabs,
	Alert
} from 'antd';
import { SendOutlined, FullscreenOutlined, ArrowsAltOutlined } from '@ant-design/icons';
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import PersistedState from 'use-persisted-state';
import SyntaxHighlighter from 'react-syntax-highlighter';
import QueueAnim from 'rc-queue-anim';
import pretty from 'pretty';
import axios from 'axios';

const { Title, Paragraph } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

export default (props) => {
	const http_url = PersistedState('http_url_repeater');
	const [ isModalVisible, setIsModalVisible ] = useState(false);

	const windowMode = () => {
		const width = 1100;
		const height = 800;

		chrome.windows.create({
			url: chrome.extension.getURL('index.html'),
			width: width,
			height: height,
			type: 'popup'
		});
	};
	const target = window.location.href;
	const showModal = () => {
		setIsModalVisible(true);
	};
	const handleClose = () => {
		setIsModalVisible(false);
	};
	const [ values, setValues ] = http_url({
		url: '',
		protocol: 'http://',
		type: 'GET'
	});
	const handleChange = (name) => (event) => {
		setValues({ ...values, [name]: event.target.value });
	};
	const handleChangeSelect = (name) => (event) => {
		setValues({ ...values, [name]: event });
	};

	// Axios fetch
	const key = 'updatable';
	const [ content, setContent ] = useState([]);
	const [ headerContent, setHeaderContent ] = useState([]);
	const [ commentResponse, setCommentResponse ] = useState([]);
	const [ inputResponse, setInputResponse ] = useState([]);
	const [ _, setLoading ] = useState();
	const fetchData = async () => {
		message.loading({ content: 'Loading...', key });
		await axios({
			method: values.type,
			url: values.protocol + values.url.replace(/https?:\/\//, ''),
			headers: {},
			auth: {}
		})
			.then((res) => {
				setLoading(false); // Set the loading to false
				setContent(res); // Axios response
				message.success({ content: 'Loaded!', key });
				setHeaderContent(res.headers['content-type']); // Header content
				console.log(res);
				const commentOnlyRegex = res.data.match(
					RegExp(/(\/\*[\w\'\s\r\n\*]*\*\/)|(\/\/[\w\s\']*)|(\<![\-\-\s\w\>\/]*\>)/, 'g')
				);
				if (commentOnlyRegex != null) setCommentResponse(commentOnlyRegex);
				const inputOnlyRegex = res.data.match(RegExp(/<form(.*?)<\/form>/, 'g'));
				if (inputOnlyRegex != null) setInputResponse(inputOnlyRegex);
			})
			.catch((err) => {
				console.log(err);
				message.error({ content: err.message, key });
			});
	};

	return (
		<QueueAnim delay={300} duration={1500}>
			<Title variant='Title level={3}' style={{ fontWeight: 'bold', margin: 15 }}>
				HTTP Repeater
			</Title>
			<Paragraph style={{ marginLeft: 15 }}>
				HTTP Repeater is a simple tool for manually manipulating and reissuing individual HTTP and WebSocket
				messages, and analyzing the application's responses. You can use Repeater for all kinds of purposes,
				such as changing parameter values to test for input-based vulnerabilities, issuing requests in a
				specific sequence to test for logic flaws.
			</Paragraph>
			<Divider dashed />
			<Row gutter={[ 16, 16 ]} style={{ padding: 15 }}>
				<Col>
					<Select
						defaultValue='GET'
						style={{ width: '100%' }}
						value={values.type}
						onChange={handleChangeSelect('type')}
					>
						<Option value={'GET'}>GET</Option>
						<Option value={'POST'}>POST</Option>
						<Option value={'HEAD'}>HEAD</Option>
						<Option value={'PUT'}>PUT</Option>
						<Option value={'DELETE'}>DELETE</Option>
						<Option value={'OPTIONS'}>OPTIONS</Option>
						<Option value={'PATCH'}>PATCH</Option>
					</Select>
				</Col>
				<Col>
					<Select
						defaultValue='http://'
						style={{ width: '100%' }}
						value={values.protocol}
						onChange={handleChangeSelect('protocol')}
					>
						<Option value={'http://'}>HTTP</Option>
						<Option value={'https://'}>HTTPS</Option>
					</Select>
				</Col>
				<Col span={9}>
					<Input
						style={{ borderColor: '#434343' }}
						onChange={handleChange('url')}
						onSubmit={() => fetchData()}
						allowClear
						value={values.url.replace(/https?:\/\//, '')}
						placeholder='http://127.0.0.1:8080/home/?a=1 OR example.com'
					/>
				</Col>
				<Col>
					<Button type='primary' onClick={() => fetchData()} icon={<SendOutlined />}>
						Send
					</Button>
				</Col>
				<Col>
					<Button type='link' danger onClick={() => fetchData()}>
						Trash
					</Button>
				</Col>
			</Row>
			{content != '' ? (
				<div style={{ padding: 15 }}>
					<Descriptions title='Request info' style={{ marginBottom: 15 }}>
						<Descriptions.Item label='Status code'>
							<Tag color='success'>
								{content.status} {content.statusText}
							</Tag>
						</Descriptions.Item>
						<Descriptions.Item label='Server'>
							<Tag color='processing'>{content.headers.server || 'Undefined'}</Tag>
						</Descriptions.Item>
						<Descriptions.Item label='Content-Type'>
							<Tag color='geekblue'>{headerContent}</Tag>
						</Descriptions.Item>
						<Descriptions.Item label='URL'>
							<a href={values.protocol + values.url} target='_blank'>
								{values.protocol + values.url}
							</a>
						</Descriptions.Item>
					</Descriptions>
					<Row gutter={[ 16, 16 ]} style={{ marginBottom: 15 }}>
						<Col span={12}>
							<TextArea
								autoSize={{ minRows: 5 }}
								disabled
								value={JSON.stringify(content.headers, undefined, 2)}
								rows={4}
							/>
						</Col>
						<Col span={12}>
							<TextArea
								autoSize={{ minRows: 5 }}
								value={JSON.stringify(content.headers, undefined, 2)}
								rows={4}
							/>
						</Col>
					</Row>
					<Tabs defaultActiveKey='1'>
						<TabPane tab='HTML Response' key='1'>
							<Row justify='end' style={{ marginTop: 5 }}>
								<Col>
									<Button type='link' onClick={showModal}>
										Render the HTML
									</Button>
								</Col>
							</Row>
							<Modal
								title='HTML Response'
								onCancel={handleClose}
								visible={isModalVisible}
								onOk={handleClose}
								width={650}
							>
								<div dangerouslySetInnerHTML={{ __html: content.data || '' }} />
							</Modal>
							<SyntaxHighlighter language='htmlbars' style={vs2015} showLineNumbers={true}>
								{pretty(content.data) || ''}
							</SyntaxHighlighter>
						</TabPane>
						{commentResponse != '' && (
							<TabPane tab='Comment Only' key='2'>
								{commentResponse.map((matches) => {
									return (
										<SyntaxHighlighter language='htmlbars' style={vs2015}>
											{matches};
										</SyntaxHighlighter>
									);
								})}
							</TabPane>
						)}
						{inputResponse != '' && (
							<TabPane tab='Form / Input Only' key='3'>
								{inputResponse.map((matches) => {
									return (
										<SyntaxHighlighter language='htmlbars' style={vs2015} showLineNumbers={true}>
											{pretty(matches)};
										</SyntaxHighlighter>
									);
								})}
							</TabPane>
						)}
					</Tabs>
				</div>
			) : (
				<div style={{ padding: 15 }}>
					<Alert
						message='Informational Notes'
						description='We recommend our users to use this feature in Fullscreen mode or Pop-up mode.'
						type='warning'
						showIcon
					/>
					<Button
						icon={<FullscreenOutlined style={{ marginRight: 5 }} />}
						style={{ marginTop: 15 }}
						type='link'
					>
						<a href={target} rel='noreferrer noopener' target='_blank'>
							Fullscreen mode
						</a>
					</Button>
					<Button
						icon={<ArrowsAltOutlined style={{ marginTop: 5 }} />}
						onClick={() => windowMode()}
						type='link'
					>
						Pop-up mode
					</Button>
				</div>
			)}
		</QueueAnim>
	);
};
