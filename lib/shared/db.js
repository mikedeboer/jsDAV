/*
 * @package jsDAV
 * @subpackage shared
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

exports.fromMultiBulk = function(data) {
    if (!data)
        return [];

    if (!Array.isArray(data))
        return [data.toString()];

    return data.map(function(buffer) {
        if (!buffer)
            return "";
        else if (Array.isArray(buffer))
            return exports.fromMultiBulk(buffer);
        else
            return buffer.toString();
    });
};
