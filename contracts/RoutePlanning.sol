// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title RoutePlanning
 * @dev Smart contract for managing traffic routes and congestion
 */
contract RoutePlanning {
    
    // Route structure
    struct Route {
        uint256 id;
        string routeId;
        string fromLocation;
        string toLocation;
        uint256 distance;
        uint256 estimatedDuration;
        uint8 congestionLevel;
        uint256 vehicleCount;
        uint8 safetyRating;
        uint256 timestamp;
        address planner;
    }
    
    // State variables
    address public owner;
    uint256 public routeCounter;
    mapping(uint256 => Route) public routes;
    mapping(string => uint256[]) public routeHistory;
    
    // Events
    event RouteCreated(uint256 indexed routeId, string from, string to, uint8 congestion, uint256 timestamp);
    event RoutePlanUpdated(uint256 indexed routeId, uint8 congestionLevel, uint256 timestamp);
    event HighCongestionAlert(uint256 indexed routeId, string routeName, uint8 congestionLevel, uint256 timestamp);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // Constructor
    constructor() {
        owner = msg.sender;
        routeCounter = 0;
    }
    
    /**
     * @dev Create or update a route plan
     * @param _routeId Unique route identifier
     * @param _fromLocation Starting location
     * @param _toLocation Ending location
     * @param _distance Route distance in km
     * @param _duration Estimated duration in minutes
     * @param _congestionLevel Congestion percentage (0-100)
     * @param _vehicleCount Number of vehicles on route
     * @param _safetyRating Safety rating (1-10)
     */
    function planRoute(
        string memory _routeId,
        string memory _fromLocation,
        string memory _toLocation,
        uint256 _distance,
        uint256 _duration,
        uint8 _congestionLevel,
        uint256 _vehicleCount,
        uint8 _safetyRating
    ) public {
        require(_distance > 0, "Distance must be positive");
        require(_congestionLevel <= 100, "Congestion must be 0-100");
        require(_safetyRating >= 1 && _safetyRating <= 10, "Safety rating must be 1-10");
        require(_vehicleCount >= 0, "Vehicle count cannot be negative");
        
        routeCounter++;
        
        Route memory newRoute = Route({
            id: routeCounter,
            routeId: _routeId,
            fromLocation: _fromLocation,
            toLocation: _toLocation,
            distance: _distance,
            estimatedDuration: _duration,
            congestionLevel: _congestionLevel,
            vehicleCount: _vehicleCount,
            safetyRating: _safetyRating,
            timestamp: block.timestamp,
            planner: msg.sender
        });
        
        routes[routeCounter] = newRoute;
        routeHistory[_routeId].push(routeCounter);
        
        emit RouteCreated(routeCounter, _fromLocation, _toLocation, _congestionLevel, block.timestamp);
        
        // Alert if high congestion
        if (_congestionLevel > 85) {
            emit HighCongestionAlert(routeCounter, _routeId, _congestionLevel, block.timestamp);
        }
    }
    
    /**
     * @dev Get route details by ID
     */
    function getRoute(uint256 _routeId) public view returns (
        uint256 id,
        string memory routeId,
        string memory fromLocation,
        string memory toLocation,
        uint256 distance,
        uint256 duration,
        uint8 congestionLevel,
        uint256 vehicleCount,
        uint8 safetyRating,
        uint256 timestamp
    ) {
        Route memory route = routes[_routeId];
        return (
            route.id,
            route.routeId,
            route.fromLocation,
            route.toLocation,
            route.distance,
            route.estimatedDuration,
            route.congestionLevel,
            route.vehicleCount,
            route.safetyRating,
            route.timestamp
        );
    }
    
    /**
     * @dev Get all routes with given ID
     */
    function getRouteHistory(string memory _routeId) public view returns (uint256[] memory) {
        return routeHistory[_routeId];
    }
    
    /**
     * @dev Get latest route information
     */
    function getLatestRoute(string memory _routeId) public view returns (
        uint8 congestionLevel,
        uint256 vehicleCount,
        uint256 duration,
        uint8 safetyRating,
        uint256 timestamp
    ) {
        uint256[] memory routeIds = routeHistory[_routeId];
        require(routeIds.length > 0, "Route not found");
        
        uint256 latestId = routeIds[routeIds.length - 1];
        Route memory route = routes[latestId];
        
        return (
            route.congestionLevel,
            route.vehicleCount,
            route.estimatedDuration,
            route.safetyRating,
            route.timestamp
        );
    }
    
    /**
     * @dev Check if route has high congestion
     */
    function isHighCongestion(string memory _routeId) public view returns (bool) {
        uint256[] memory routeIds = routeHistory[_routeId];
        require(routeIds.length > 0, "Route not found");
        
        uint256 latestId = routeIds[routeIds.length - 1];
        return routes[latestId].congestionLevel > 85;
    }
    
    /**
     * @dev Get average congestion for a route
     */
    function getAverageCongestion(string memory _routeId) public view returns (uint256) {
        uint256[] memory routeIds = routeHistory[_routeId];
        require(routeIds.length > 0, "Route not found");
        
        uint256 totalCongestion = 0;
        for (uint256 i = 0; i < routeIds.length; i++) {
            totalCongestion += routes[routeIds[i]].congestionLevel;
        }
        
        return totalCongestion / routeIds.length;
    }
    
    /**
     * @dev Get total routes recorded
     */
    function getTotalRoutes() public view returns (uint256) {
        return routeCounter;
    }
    
    /**
     * @dev Verify route exists
     */
    function verifyRoute(uint256 _routeId) public view returns (bool) {
        return routes[_routeId].timestamp > 0;
    }
}
