// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title VehicleDetection
 * @dev Smart contract for recording vehicle detection data
 */
contract VehicleDetection {
    
    // Vehicle detection record structure
    struct Detection {
        uint256 id;
        string cameraId;
        string junctionId;
        uint256 carCount;
        uint256 bikeCount;
        uint256 busCount;
        uint256 truckCount;
        uint256 ambulanceCount;
        uint256 pedestrianCount;
        uint256 totalVehicles;
        bytes32 frameHash;
        uint256 timestamp;
        address detector;
    }
    
    // State variables
    address public owner;
    uint256 public detectionCounter;
    mapping(uint256 => Detection) public detections;
    mapping(string => uint256[]) public cameraDetections;
    mapping(string => uint256[]) public junctionDetections;
    mapping(bytes32 => bool) public frameHashes; // Prevent duplicate frames
    
    // Events
    event VehicleDetected(
        uint256 indexed detectionId,
        string cameraId,
        uint256 totalVehicles,
        uint256 timestamp
    );
    event HighVehicleAlert(
        uint256 indexed detectionId,
        string junctionId,
        uint256 vehicleCount,
        uint256 timestamp
    );
    event FrameRecorded(
        uint256 indexed detectionId,
        string cameraId,
        bytes32 frameHash,
        uint256 timestamp
    );
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier frameNotExists(bytes32 _frameHash) {
        require(!frameHashes[_frameHash], "Frame hash already exists");
        _;
    }
    
    // Constructor
    constructor() {
        owner = msg.sender;
        detectionCounter = 0;
    }
    
    /**
     * @dev Record vehicle detection from camera
     * @param _cameraId Camera identifier
     * @param _junctionId Junction identifier
     * @param _carCount Number of cars detected
     * @param _bikeCount Number of bikes detected
     * @param _busCount Number of buses detected
     * @param _truckCount Number of trucks detected
     * @param _ambulanceCount Number of ambulances detected
     * @param _pedestrianCount Number of pedestrians detected
     * @param _frameHash Hash of the video frame (SHA256)
     */
    function recordDetection(
        string memory _cameraId,
        string memory _junctionId,
        uint256 _carCount,
        uint256 _bikeCount,
        uint256 _busCount,
        uint256 _truckCount,
        uint256 _ambulanceCount,
        uint256 _pedestrianCount,
        bytes32 _frameHash
    ) public frameNotExists(_frameHash) {
        require(_carCount >= 0, "Car count cannot be negative");
        require(_bikeCount >= 0, "Bike count cannot be negative");
        require(_busCount >= 0, "Bus count cannot be negative");
        require(_truckCount >= 0, "Truck count cannot be negative");
        require(_ambulanceCount >= 0, "Ambulance count cannot be negative");
        require(_pedestrianCount >= 0, "Pedestrian count cannot be negative");
        
        detectionCounter++;
        
        uint256 totalVehicles = _carCount + _bikeCount + _busCount + _truckCount + _ambulanceCount;
        
        Detection memory newDetection = Detection({
            id: detectionCounter,
            cameraId: _cameraId,
            junctionId: _junctionId,
            carCount: _carCount,
            bikeCount: _bikeCount,
            busCount: _busCount,
            truckCount: _truckCount,
            ambulanceCount: _ambulanceCount,
            pedestrianCount: _pedestrianCount,
            totalVehicles: totalVehicles,
            frameHash: _frameHash,
            timestamp: block.timestamp,
            detector: msg.sender
        });
        
        detections[detectionCounter] = newDetection;
        cameraDetections[_cameraId].push(detectionCounter);
        junctionDetections[_junctionId].push(detectionCounter);
        frameHashes[_frameHash] = true;
        
        emit VehicleDetected(detectionCounter, _cameraId, totalVehicles, block.timestamp);
        emit FrameRecorded(detectionCounter, _cameraId, _frameHash, block.timestamp);
        
        // Alert if high vehicle count
        if (totalVehicles > 100) {
            emit HighVehicleAlert(detectionCounter, _junctionId, totalVehicles, block.timestamp);
        }
    }
    
    /**
     * @dev Get detection details by ID
     */
    function getDetection(uint256 _detectionId) public view returns (
        uint256 id,
        string memory cameraId,
        string memory junctionId,
        uint256 carCount,
        uint256 bikeCount,
        uint256 busCount,
        uint256 truckCount,
        uint256 ambulanceCount,
        uint256 pedestrianCount,
        uint256 totalVehicles,
        uint256 timestamp
    ) {
        Detection memory detection = detections[_detectionId];
        return (
            detection.id,
            detection.cameraId,
            detection.junctionId,
            detection.carCount,
            detection.bikeCount,
            detection.busCount,
            detection.truckCount,
            detection.ambulanceCount,
            detection.pedestrianCount,
            detection.totalVehicles,
            detection.timestamp
        );
    }
    
    /**
     * @dev Get all detections from a camera
     */
    function getCameraDetections(string memory _cameraId) public view returns (uint256[] memory) {
        return cameraDetections[_cameraId];
    }
    
    /**
     * @dev Get all detections from a junction
     */
    function getJunctionDetections(string memory _junctionId) public view returns (uint256[] memory) {
        return junctionDetections[_junctionId];
    }
    
    /**
     * @dev Get latest detection from a camera
     */
    function getLatestDetection(string memory _cameraId) public view returns (
        uint256 id,
        uint256 totalVehicles,
        uint256 carCount,
        uint256 bikeCount,
        uint256 timestamp
    ) {
        uint256[] memory detectionIds = cameraDetections[_cameraId];
        require(detectionIds.length > 0, "No detections found for camera");
        
        uint256 latestId = detectionIds[detectionIds.length - 1];
        Detection memory detection = detections[latestId];
        
        return (
            detection.id,
            detection.totalVehicles,
            detection.carCount,
            detection.bikeCount,
            detection.timestamp
        );
    }
    
    /**
     * @dev Get average vehicle count for a camera
     */
    function getAverageVehicleCount(string memory _cameraId) public view returns (uint256) {
        uint256[] memory detectionIds = cameraDetections[_cameraId];
        require(detectionIds.length > 0, "No detections found");
        
        uint256 totalVehicles = 0;
        for (uint256 i = 0; i < detectionIds.length; i++) {
            totalVehicles += detections[detectionIds[i]].totalVehicles;
        }
        
        return totalVehicles / detectionIds.length;
    }
    
    /**
     * @dev Verify frame hash (check if frame exists)
     */
    function verifyFrame(bytes32 _frameHash) public view returns (bool) {
        return frameHashes[_frameHash];
    }
    
    /**
     * @dev Get total detections recorded
     */
    function getTotalDetections() public view returns (uint256) {
        return detectionCounter;
    }
    
    /**
     * @dev Verify detection exists
     */
    function verifyDetection(uint256 _detectionId) public view returns (bool) {
        return detections[_detectionId].timestamp > 0;
    }
    
    /**
     * @dev Get vehicle distribution for latest detection
     */
    function getVehicleDistribution(string memory _cameraId) public view returns (
        uint256 cars,
        uint256 bikes,
        uint256 buses,
        uint256 trucks,
        uint256 ambulances
    ) {
        uint256[] memory detectionIds = cameraDetections[_cameraId];
        require(detectionIds.length > 0, "No detections found");
        
        uint256 latestId = detectionIds[detectionIds.length - 1];
        Detection memory detection = detections[latestId];
        
        return (
            detection.carCount,
            detection.bikeCount,
            detection.busCount,
            detection.truckCount,
            detection.ambulanceCount
        );
    }
}
