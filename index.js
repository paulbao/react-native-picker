'use strict';

import React, {
	StyleSheet, 
	PropTypes, 
	View, 
	Text,
	Animated,
	Platform,
	Dimensions,
	PickerIOS
} from 'react-native';

import PickerAndroid from 'react-native-picker-android';

let Picker = Platform.OS === 'ios' ? PickerIOS : PickerAndroid;
let PickerItem = Picker.Item;
let width = Dimensions.get('window').width;
let height = Dimensions.get('window').height;

export default class PickerAny extends React.Component {

	static propTypes = {
		pickerBtnText: PropTypes.string,
		pickerCancelBtnText: PropTypes.string,
		pickerBtnStyle: PropTypes.any,
		pickerTitle: PropTypes.string,
		pickerTitleStyle: PropTypes.any,
		pickerToolBarStyle: PropTypes.any,
		pickerItemStyle: PropTypes.any,
		pickerHeight: PropTypes.number,
		showDuration: PropTypes.number,
		pickerData: PropTypes.any.isRequired,
		selectedValue: PropTypes.any.isRequired,
		onPickerDone: PropTypes.func,
		onPickerCancel: PropTypes.func,
		onValueChange: PropTypes.func
	};

	static defaultProps = {
		pickerBtnText: '完成',
		pickerCancelBtnText: '取消',
		pickerHeight: 250,
		showDuration: 300,
		onPickerDone: ()=>{},
		onPickerCancel: ()=>{},
		onValueChange: ()=>{}
	};

	constructor(props, context){
		super(props, context);
	}

	componentWillMount(){
		this.state = this._getStateFromProps(this.props);
	}

	componentWillReceiveProps(newProps){
		let newState = this._getStateFromProps(newProps);
		this.setState(newState);
	}

	shouldComponentUpdate(nextProps, nextState, context){
		if(JSON.stringify(nextState.selectedValue) === JSON.stringify(this.state.selectedValue)){
			return false;
		}
		return true;
	}

	_getStateFromProps(props){
		//the pickedValue must looks like [wheelone's, wheeltwo's, ...]
		//this.state.selectedValue may be the result of the first pickerWheel
		let style = props.style;
		let pickerBtnText = props.pickerBtnText;
		let pickerCancelBtnText = props.pickerCancelBtnText;
		let pickerBtnStyle = props.pickerBtnStyle;
		let pickerTitle = props.pickerTitle;
		let pickerTitleStyle = props.pickerTitleStyle;
		let pickerToolBarStyle = props.pickerToolBarStyle;
		let pickerItemStyle = props.pickerItemStyle;
		let pickerHeight = props.pickerHeight;
		let showDuration = props.showDuration;
		let pickerData = props.pickerData;
		let selectedValue = props.selectedValue;
		let onPickerDone = props.onPickerDone;
		let onPickerCancel = props.onPickerCancel;
		let onValueChange = props.onValueChange;

		let pickerStyle = pickerData.constructor === Array ? 'parallel' : 'cascade';
		let firstWheelData;
		let firstPickedData;
		let secondPickedData;
		let secondWheelData;
		let secondPickedDataIndex;
		let thirdWheelData;
		let thirdPickedDataIndex;
		let cascadeData = {};
		let slideAnim = (this.state && this.state.slideAnim ? this.state.slideAnim : new Animated.Value(-props.pickerHeight));
		
		if(pickerStyle === 'parallel'){
			//compatible single wheel sence
			if(selectedValue.constructor !== Array){
				selectedValue = [selectedValue];
			}
			if(pickerData[0].constructor !== Array){
				pickerData = [pickerData];
			}
		}
		else if(pickerStyle === 'cascade'){
			//only support three stage
			firstWheelData = Object.keys(pickerData);
			firstPickedData = props.selectedValue[0];
			secondPickedData = props.selectedValue[1];
			cascadeData = this._getCascadeData(pickerData, selectedValue, firstPickedData, secondPickedData, true);
		}
		//save picked data
		this.pickedValue = JSON.parse(JSON.stringify(selectedValue));
		this.pickerStyle = pickerStyle;
		return {
			style,
			pickerBtnText,
			pickerCancelBtnText,
			pickerBtnStyle,
			pickerTitle,
			pickerTitleStyle,
			pickerToolBarStyle,
			pickerItemStyle,
			pickerHeight,
			showDuration,
			pickerData,
			selectedValue,
			onPickerDone,
			onPickerCancel,
			onValueChange,
			//list of first wheel data
			firstWheelData,
			//first wheel selected value
			firstPickedData,
			slideAnim,
			//list of second wheel data and pickedDataIndex
			secondWheelData: cascadeData.secondWheelData,
			secondPickedDataIndex: cascadeData.secondPickedDataIndex,
			//third wheel selected value and pickedDataIndex
			thirdWheelData: cascadeData.thirdWheelData,
			thirdPickedDataIndex: cascadeData.thirdPickedDataIndex
		};
	}

	_slideUp(){
		this.isMoving = true;
		Animated.timing(
			this.state.slideAnim,
			{
				toValue: 0,
				duration: this.state.showDuration,
			}
		).start((evt) => {
			if(evt.finished) {
				this.isMoving = false;
				this.isPickerShow = true;
			}
		});
	}

	_slideDown(){
		this.isMoving = true;
		Animated.timing(
			this.state.slideAnim,
			{
				toValue: -this.state.pickerHeight,
				duration: this.state.showDuration,
			}
		).start((evt) => {
			if(evt.finished) {
				this.isMoving = false;
				this.isPickerShow = false;
			}
		});
	}

	_toggle(){
		if(this.isMoving) {
			return;
		}
		if(this.isPickerShow) {
			this._slideDown();
		}
		else{
			this._slideUp();
		}
	}
	//向父组件提供方法
	toggle(){
		this._toggle();
	}
	dismiss(){
		this._slideDown();
	}
	_prePressHandle(callback){
		//通知子组件往上滚
		this.pickerWheel.moveUp();
	}

	_nextPressHandle(callback){
		//通知子组件往下滚
		this.pickerWheel.moveDown();
	}

	_pickerCancel() {
		this._toggle();
		this.state.onPickerCancel();
	}

	_pickerFinish(){
		this._toggle();
		this.state.onPickerDone(this.pickedValue);
	}

	_renderParallelWheel(pickerData){
		let me = this;
		return pickerData.map((item, index) => {
			return (
				<View style={styles.pickerWheel} key={index}>
					<Picker
						selectedValue={me.state.selectedValue[index]}
						onValueChange={value => {
							me.pickedValue.splice(index, 1, value);
							//do not set state to another object!! why?
							// me.setState({
							// 	selectedValue: me.pickedValue
							// });
							me.setState({
								selectedValue: JSON.parse(JSON.stringify(me.pickedValue))
							});
							me.state.onValueChange(JSON.parse(JSON.stringify(me.pickedValue)), index);
						}} >
						{item.map((value, index) => (
							<PickerItem
								key={index}
								value={value}
								label={value.toString()}
							/>)
						)}
					</Picker>
				</View>
			);
		});
	}

	_getCascadeData(pickerData, pickedValue, firstPickedData, secondPickedData, onInit){
		let secondWheelData;
		let secondPickedDataIndex;
		let thirdWheelData;
		let thirdPickedDataIndex;
		//only support two and three stage
		for(let key in pickerData){
			//two stage
			if(pickerData[key].constructor === Array){
				secondWheelData = pickerData[firstPickedData];
				if(onInit){
					secondWheelData.forEach(function(v, k){
						if(v === pickedValue[1]){
							secondPickedDataIndex = k;
						}
					}.bind(this));
				}
				else{
					secondPickedDataIndex = 0;
				}
				break;
			}
			//three stage
			else{
				secondWheelData = Object.keys(pickerData[firstPickedData]);
				if(onInit){
					secondWheelData.forEach(function(v, k){
						if(v === pickedValue[1]){
							secondPickedDataIndex = k;
						}
					}.bind(this));
				}
				else{
					secondPickedDataIndex = 0;
				}
				thirdWheelData = pickerData[firstPickedData][secondPickedData];
				if(onInit){
					thirdWheelData.forEach(function(v, k){
						if(v === pickedValue[2]){
							thirdPickedDataIndex = k;
						}
					})
				}
				else{
					thirdPickedDataIndex = 0;
				}
				break;
			}
		}

		return {
			secondWheelData,
			secondPickedDataIndex,
			thirdWheelData,
			thirdPickedDataIndex
		}
	}

	_renderCascadeWheel(pickerData){
		let me = this;
		let thirdWheel = me.state.thirdWheelData && (
			<View style={styles.pickerWheel}>
				<Picker
					ref={'thirdWheel'}
					selectedValue={me.state.thirdPickedDataIndex}
					onValueChange={(index) => {
						//on ios platform 'this' refers to Picker?
						me.pickedValue.splice(2, 1, me.state.thirdWheelData[index]);
						me.setState({
							thirdPickedDataIndex: index,
							selectedValue: 'wheel3'+index
						});
						me.state.onValueChange(JSON.parse(JSON.stringify(me.pickedValue)), 2);
					}} >
					{me.state.thirdWheelData.map((value, index) => (
						<PickerItem
							key={index}
							value={index}
							label={value.toString()}
						/>)
					)}
				</Picker>
			</View>
		);

		return (
			<View style={styles.pickerWrap}>
				<View style={styles.pickerWheel}>
					<Picker
						ref={'firstWheel'}
						selectedValue={me.state.firstPickedData}
						onValueChange={value => {
							let secondWheelData = Object.keys(pickerData[value]);
							let cascadeData = me._getCascadeData(pickerData, me.pickedValue, value, secondWheelData[0]);
							//when onPicked, this.pickedValue will pass to the parent
							//when firstWheel changed, second and third will also change
							if(cascadeData.thirdWheelData){
								me.pickedValue.splice(0, 3, value, cascadeData.secondWheelData[0], cascadeData.thirdWheelData[0]);
							}
							else{
								me.pickedValue.splice(0, 2, value, cascadeData.secondWheelData[0]);
							}
							
							me.setState({
								selectedValue: 'wheel1'+value,
								firstPickedData: value,
								secondWheelData: cascadeData.secondWheelData,
								secondPickedDataIndex: 0,
								thirdWheelData: cascadeData.thirdWheelData,
								thirdPickedDataIndex: 0
							});
							me.state.onValueChange(JSON.parse(JSON.stringify(me.pickedValue)), 0);
							me.refs.secondWheel && me.refs.secondWheel.moveTo && me.refs.secondWheel.moveTo(0);
							me.refs.thirdWheel && me.refs.thirdWheel.moveTo && me.refs.thirdWheel.moveTo(0);
						}} >
						{me.state.firstWheelData.map((value, index) => (
							<PickerItem
								key={index}
								value={value}
								label={value.toString()}
							/>)
						)}
					</Picker>
				</View>
				<View style={styles.pickerWheel}>
					<Picker
						ref={'secondWheel'}
						selectedValue={me.state.secondPickedDataIndex}
						onValueChange={(index) => {
							let thirdWheelData = pickerData[me.state.firstPickedData][me.state.secondWheelData[index]];
							if(thirdWheelData){
								me.pickedValue.splice(1, 2, me.state.secondWheelData[index], thirdWheelData[0]);	
							}
							else{
								me.pickedValue.splice(1, 1, me.state.secondWheelData[index]);
							}
							
							me.setState({
								secondPickedDataIndex: index,
								thirdWheelData,
								thirdPickedDataIndex: 0,
								selectedValue: 'wheel2'+index
							});
							me.state.onValueChange(JSON.parse(JSON.stringify(me.pickedValue)), 1);
							me.refs.thirdWheel && me.refs.thirdWheel.moveTo && me.refs.thirdWheel.moveTo(0);
						}} >
						{me.state.secondWheelData.map((value, index) => (
							<PickerItem
								key={index}
								value={index}
								label={value.toString()}
							/>)
						)}
					</Picker>
				</View>
				{thirdWheel}
			</View>
		);
	}

	_renderWheel(pickerData){
		/*
			some sences:
			1.	single wheel:
				[1,2,3,4]
			2.	two or more:
				[
					[1,2,3,4],
					[5,6,7,8],
					...
				]
			3.	two stage cascade:
				{
					a: [1,2,3,4],
					b: [5,6,7,8],
					...
				}
			4.	three stage cascade:
				{
					a: {
						a1: [1,2,3,4],
						a2: [5,6,7,8],
						a3: [9,10,11,12]
					},
					b: {
						b1: [1,2,3,4],
						b2: [5,6,7,8],
						b3: [9,10,12,12]
					}
					...
				}
			we call 1、2 parallel and 3、4 cascade
		*/
		let wheel = null;
		if(this.pickerStyle === 'parallel'){
			wheel = this._renderParallelWheel(pickerData);
		}
		else if(this.pickerStyle === 'cascade'){
			wheel = this._renderCascadeWheel(pickerData);
		}
		return wheel;
	}
	
	render(){
		/*let pickerBtn = Platform.OS === 'ios' ? null : (
			<View style={styles.pickerBtnView}>
				<Text style={styles.pickerMoveBtn} onPress={this._prePressHandle.bind(this)}>上一个</Text>
				<Text style={styles.pickerMoveBtn} onPress={this._nextPressHandle.bind(this)}>下一个</Text>
			</View>
		);*/
		// let pickerBtn = null;
		return (
			<Animated.View style={[styles.picker, {
				height: this.state.pickerHeight,
				bottom: this.state.slideAnim
			}, this.state.style]}>
				<View style={[styles.pickerToolbar, this.state.pickerToolBarStyle]}>
					<View style={styles.pickerCancelBtn}>
						<Text style={[styles.pickerFinishBtnText, this.state.pickerBtnStyle]}
							onPress={this._pickerCancel.bind(this)}>{this.state.pickerCancelBtnText}</Text>
					</View>
					<Text style={[styles.pickerTitle, this.state.pickerTitleStyle]} numberOfLines={1}>
						{this.state.pickerTitle}
					</Text>
					<View style={styles.pickerFinishBtn}>
						<Text style={[styles.pickerFinishBtnText, this.state.pickerBtnStyle]}
							onPress={this._pickerFinish.bind(this)}>{this.state.pickerBtnText}</Text>
					</View>
				</View>
				<View style={styles.pickerWrap}>
					{this._renderWheel(this.state.pickerData)}
				</View>
			</Animated.View>
		);
	}
};

let styles = StyleSheet.create({
	picker: {
		width: width,
		position: 'absolute',
		bottom: 0,
		left: 0,
		backgroundColor: '#bdc0c7',
		overflow: 'hidden'
	},
	pickerWrap: {
		width: width,
		flexDirection: 'row'
	},
	pickerWheel: {
		flex: 1
	},
	pickerToolbar: {
		height: 30,
		width: width,
		backgroundColor: '#e6e6e6',
		flexDirection: 'row',
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: '#c3c3c3',
		alignItems: 'center'
	},
	pickerBtnView: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'flex-start',
		alignItems: 'center'
	},
	pickerMoveBtn: {
		color: '#149be0',
		fontSize: 16,
		marginLeft: 20
	},
	pickerCancelBtn: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'flex-start',
		alignItems: 'center',
		marginLeft: 20
	},
	pickerTitle: {
		flex: 4,
		color: 'black',
		textAlign: 'center'
	},
	pickerFinishBtn: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'flex-end',
		alignItems: 'center',
		marginRight: 20
	},
	pickerFinishBtnText: {
		fontSize: 16,
		color: '#149be0'
	}
});
