import React from 'react';
import {
    Form,
    FormGroup,
    Input,
    Button,
    Label,
    FormFeedback
} from 'reactstrap';
import PropTypes from 'prop-types';
import { WithSJCCourses } from '../../../../contexts/SJCCourseContext';
import AlternativeCourseModal from './AlternativeCourseModal';

const isObjEmpty = (obj) => !!Object.keys(obj).length;

export class MapFormComponent extends React.Component{
    constructor(props){
        super(props);
        let savedMapToEdit = this.props.savedMapToEdit;
        let {name,requirements} = savedMapToEdit;
        let {courseSlots,optionsByReqId} = requirements.reduce(
            ({courseSlots,optionsByReqId},req)=> {
                optionsByReqId[req.id] = [];
                let idsOfCoursesAddedToOptions = new Set();
            
                // Create selectionFields for default_courses.
                req.default_courses.forEach(
                    course => {
                        optionsByReqId[req.id].push(course)
                        idsOfCoursesAddedToOptions.add(course.id);
                    }
                )
                
                // Create courseSlots for state; add additional courses to selectionFields, if not already present.
                req.course_slots.forEach(
                    course_slot => {
                        courseSlots[course_slot.name] = course_slot.course
                        if(Object.keys(course_slot.course).length && (!idsOfCoursesAddedToOptions.has(course_slot.course.id))){
                            optionsByReqId[req.id].push(course_slot.course);
                            idsOfCoursesAddedToOptions.add(course_slot.course.id);
                        }
                    }
                )
                return {courseSlots,optionsByReqId};
            },{courseSlots:{},optionsByReqId:{}}
        );
        this.optionsByReqId = optionsByReqId;
        this.state = {
            name,
            courseSlots,
            altCourseModalOpen:false,
            altCourseModalReqId:'',
            altCourseModalSlotId:''
        };
        this.applicableCourseIds = new Set(this.props.savedMapToEdit.applicable_courses.map(course=>String(course.id)));
        this.applicableCourseIds.add("-1"); // Unspecified courses are "applicable."
    }

    isCourseNotApplicable = ({id}) => {
        return !this.applicableCourseIds.has(String(id||"-1"));
    }

    handleNameChange = ({target:{value}}) => {
        this.setState({name:value},()=>{this.props.savedMapToEdit.name=value});
    }

    toggleAltCourseModal = () => {
        this.setState({
            altCourseModalOpen:!this.state.altCourseModalOpen
        });
    }

    createCourseModal = (fieldName) => {
        this.setState({
            altCourseModalField:fieldName,
            altCourseModalOpen:true
        });
    }

    getSelectionFromModal = (reqId,slotId,course) => {
        let requirement = this.props.savedMapToEdit.requirements.filter(req=>req.id===reqId)[0];
        let slot = requirement.course_slots.filter(slot=>slot.id===slotId)[0];
        let slotName = slot.name;
        console.log(slotName);
        this.setState(prevState => ({
            ...prevState,
            courseSlots:{
                ...this.state.courseSlots,
                [slotName]:course
            }
        }),()=>{slot.course = course});
        this.optionsByReqId[reqId].push(course);
    }

    cleanCourses = (sjcCourses) => {
        sjcCourses.forEach(
            course=>{
                let number = course.sjc_number;
                course.sjc_number = number.substring(0,1)+'4'+number.substring(2)
                let parenStuff = course.sjc_name.match(/\(\S+\)/);
                if(parenStuff){
                    course.sjc_name=course.sjc_name.substring(0,parenStuff.index)
                }
            }
        )
        return sjcCourses;
    }

    saveMapLocally = (mapData) => {
        let saveId = this.props.login.state.userEmail+this.props.savedMapToEdit.id;
        localStorage.setItem(saveId,mapData);
    }

    sortByRubricThenNumber = (course1,course2) => {
        if(course1.sjc_rubric>course2.sjc_rubric){
            return 1;
        } else if(course1.sjc_rubric===course2.sjc_rubric){
            if(course1.sjc_number>course2.sjc_number){
                return 1;
            } else {
                return -1;
            }
        } else {
            return -1;
        }
    }

    handleCourseSelection = (reqId,slotId,slotName,selectedCourse) => {
        let formerSelection = this.state.courseSlots[slotName];
        let {default_courses} = this.props.savedMapToEdit.requirements.filter(req=>req.id===reqId)[0];
        
        let formerSelectionNotInDefault = !default_courses.filter(def_course=>def_course.id === formerSelection.id).length;
        let newSelectionNotInDefault = !default_courses.filter(def_course=>String(def_course.id) === String(selectedCourse.id)).length;
        if(formerSelectionNotInDefault){
            // Remove former selection from optionsByReqId
            this.optionsByReqId[reqId] = this.optionsByReqId[reqId].filter(course=>course.id !== formerSelection.id);
            if(newSelectionNotInDefault){
                // Add new selection to optionsByReqId
                this.optionsByReqId[reqId].push(selectedCourse);
            }
        }

        // Insert new selection into optionsByReq[reqId]

        this.setState(
            prevState => ({
                ...prevState,
                courseSlots: {
                    ...prevState.courseSlots,
                    [slotName]:selectedCourse
                }
            }),
            () => {
                let req = this.props.savedMapToEdit.requirements.filter(req=>req.id===reqId)[0];
                let slot = req.course_slots.filter(slot=>slot.id===slotId)[0];
                slot.course = selectedCourse;
            }
        );
    }

        initializeAltCourseModal = (reqId,slotId) => {
            this.setState({
                altCourseModalReqId:reqId,
                altCourseModalSlotId:slotId,
                altCourseModalOpen:!this.state.altCourseModalOpen
            });
        }

    render(){
        /*
        window.onbeforeunload = () => {
            sessionStorage.setItem('prevMapState',JSON.stringify(this.state));
        }
        */
        let {univ_name,name,prog_name,assoc_name,requirements} = this.props.savedMapToEdit;
        let courseSelectionFields = requirements.map(
            requirement => (
                    <FormGroup key={"formgroup"+requirement.name}>
                        <Label><strong>{`${requirement.name} (${requirement.hours} hours)`}</strong></Label>
                        {requirement.course_slots.map(
                            slot => {
                                let course = this.state.courseSlots[slot.name] || {};
                                return (<div key={slot.name}>
                                    <Input 
                                        key={slot.name} 
                                        type={"select"}
                                        value={isObjEmpty(course)?course.id:"-1"}
                                        invalid={this.isCourseNotApplicable(course)}
                                        onChange={
                                            ({target:{value}})=>{
                                                if(value === "-2"){
                                                    this.initializeAltCourseModal(requirement.id,slot.id);
                                                }
                                                let name = slot.name;
                                                let course = this.optionsByReqId[requirement.id].filter(def_course=>String(def_course.id)===value)[0] || {};
                                                this.handleCourseSelection(requirement.id,slot.id,name,course);
                                                }
                                            }
                                    >
                                    <option value={"-1"}>Please select a course.</option>
                                    {
                                        this.optionsByReqId[requirement.id].map(
                                            (course,i)=><option key={i} value={course.id}>{course.rubric} {course.number} - {course.name}</option>
                                        )
                                    }
                                    <option value={"-2"}>Select alternative course.</option>
                                    </Input>
                                    <FormFeedback invalid={true}>Selected course may not apply to this degree.</FormFeedback>
                                    </div>
                                    )
                            }
                        )}
                    </FormGroup>
                 )
        );
        return (
        <div>
            <Form>
                <FormGroup>
                    <label><strong>Transfer University:</strong></label>
                    <Input key={"univ_name"} type="text" value={univ_name} disabled/>
                </FormGroup>
                <hr/>
                <FormGroup>
                    <label><strong>SJC Associate Degree:</strong></label>
                    <Input key={"associate_degree"} type="text" value={assoc_name} disabled/>
                </FormGroup>
                <FormGroup>
                    <label><strong>Transfer Program:</strong></label>
                    <Input key={"prog_name"} type="text" value={prog_name} disabled/>
                </FormGroup>
                <FormGroup>
                    <label><strong>Pathway Map Name:</strong></label>
                    <Input key={"map_name"} type="text" value={this.state.name} onChange={this.handleNameChange}/>
                </FormGroup>
                <hr/>
                {courseSelectionFields}
            </Form>
            <Form>
                <FormGroup>
                    <Button className="btn-sm" color="secondary" onClick={this.props.handleClose}>Close</Button>
                    <Button className="btn-sm" color="primary" onClick={()=>this.props.handleSave(this.props.savedMapToEdit)}>Save</Button>
                </FormGroup>
            </Form>
            <AlternativeCourseModal
                isOpen={this.state.altCourseModalOpen}
                toggle={this.toggleAltCourseModal}
                SJCCourses={this.props.SJCCourses}
                reqId={this.state.altCourseModalReqId}
                slotId={this.state.altCourseModalSlotId}
                getSelectionFromModal={this.getSelectionFromModal}
            />
        </div>
        )
    }
}

MapFormComponent.propTypes = {
    savedMapToEdit:PropTypes.object.isRequired
}

const MapForm = WithSJCCourses(MapFormComponent);

export default MapForm;