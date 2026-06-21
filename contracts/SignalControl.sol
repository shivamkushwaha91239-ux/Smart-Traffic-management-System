// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SignalControl
 * @dev Smart contract for managing traffic signal control
 */
contract SignalControl {
    
    // Signal states
    enum SignalState { RED, YELLOW, GREEN }
    
    // Signal record structure
    struct Signal {
        uint256 id;
        string junctionId;
        SignalState state;
        uint256 duration;
        uint256 vehicleCount;
        uint256 waitTime;
        uint256 timestamp;
        address controller;
    }
    
    // State variables
    address public owner;
    uint256 public signalCounter;
    mapping(uint256 => Signal) public signals;
    mapping(string => uint256[]) public junctionSignals;
    
    // Events
    event SignalCreated(uint256 indexed signalId, string junctionId, string state, uint256 timestamp);
    event SignalUpdated(uint256 indexed signalId, string state, uint256 timestamp);
    event SignalControlled(uint256 indexed signalId, string junctionId, string state, uint256 duration);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // Constructor
    constructor() {
        owner = msg.sender;
        signalCounter = 0;
    }
    
    /**
     * @dev Set traffic signal for a junction
     * @param _junctionId Junction identifier
     * @param _state Signal state (0=RED, 1=YELLOW, 2=GREEN)
     * @param _duration Duration in seconds
     * @param _vehicleCount Number of vehicles at junction
     * @param _waitTime Average wait time in seconds
     */
    function setSignal(
        string memory _junctionId,
        uint8 _state,
        uint256 _duration,
        uint256 _vehicleCount,
        uint256 _waitTime
    ) public {
        require(_state >= 0 && _state <= 2, "Invalid signal state");
        require(_duration > 0, "Duration must be positive");
        require(_vehicleCount >= 0, "Vehicle count cannot be negative");
        require(_waitTime <= 300, "Wait time cannot exceed 300 seconds");
        
        signalCounter++;
        
        SignalState state;
        if (_state == 0) state = SignalState.RED;
        else if (_state == 1) state = SignalState.YELLOW;
        else state = SignalState.GREEN;
        
        Signal memory newSignal = Signal({
            id: signalCounter,
            junctionId: _junctionId,
            state: state,
            duration: _duration,
            vehicleCount: _vehicleCount,
            waitTime: _waitTime,
            timestamp: block.timestamp,
            controller: msg.sender
        });
        
        signals[signalCounter] = newSignal;
        junctionSignals[_junctionId].push(signalCounter);
        
        emit SignalCreated(signalCounter, _junctionId, getStateName(state), block.timestamp);
        emit SignalControlled(signalCounter, _junctionId, getStateName(state), _duration);
    }
    
    /**
     * @dev Get signal details by ID
     */
    function getSignal(uint256 _signalId) public view returns (
        uint256 id,
        string memory junctionId,
        string memory state,
        uint256 duration,
        uint256 vehicleCount,
        uint256 waitTime,
        uint256 timestamp
    ) {
        Signal memory signal = signals[_signalId];
        return (
            signal.id,
            signal.junctionId,
            getStateName(signal.state),
            signal.duration,
            signal.vehicleCount,
            signal.waitTime,
            signal.timestamp
        );
    }
    
    /**
     * @dev Get all signals for a junction
     */
    function getJunctionSignals(string memory _junctionId) public view returns (uint256[] memory) {
        return junctionSignals[_junctionId];
    }
    
    /**
     * @dev Get latest signal for a junction
     */
    function getLatestSignal(string memory _junctionId) public view returns (
        uint256 id,
        string memory state,
        uint256 duration,
        uint256 vehicleCount,
        uint256 timestamp
    ) {
        uint256[] memory signalIds = junctionSignals[_junctionId];
        require(signalIds.length > 0, "No signals found for junction");
        
        uint256 latestId = signalIds[signalIds.length - 1];
        Signal memory signal = signals[latestId];
        
        return (
            signal.id,
            getStateName(signal.state),
            signal.duration,
            signal.vehicleCount,
            signal.timestamp
        );
    }
    
    /**
     * @dev Convert signal state enum to string
     */
    function getStateName(SignalState _state) internal pure returns (string memory) {
        if (_state == SignalState.RED) return "RED";
        if (_state == SignalState.YELLOW) return "YELLOW";
        return "GREEN";
    }
    
    /**
     * @dev Get total signals recorded
     */
    function getTotalSignals() public view returns (uint256) {
        return signalCounter;
    }
    
    /**
     * @dev Verify signal validity
     */
    function verifySignal(uint256 _signalId) public view returns (bool) {
        return signals[_signalId].timestamp > 0;
    }
}
